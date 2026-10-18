import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../state/auth_state.dart';
import '../../widgets/common.dart';
import '../../widgets/map_view.dart';

/// Rider app: assigned deliveries, live GPS sharing, directions, and delivery confirmation by code.
class RiderScreen extends StatefulWidget {
  const RiderScreen({super.key});
  @override
  State<RiderScreen> createState() => _RiderScreenState();
}

class _RiderScreenState extends State<RiderScreen> {
  Json? _data;
  Object? _error;
  Timer? _refresh;

  @override
  void initState() {
    super.initState();
    _load();
    // New deliveries appear without the rider having to pull to refresh.
    _refresh = Timer.periodic(const Duration(seconds: 20), (_) => _load());
  }

  @override
  void dispose() {
    _refresh?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final d = await api.get('/rider/deliveries');
      if (mounted) setState(() => _data = d);
    } catch (e) {
      if (mounted && _data == null) setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    final deliveries = (_data?['deliveries'] as List? ?? const []).cast<Json>();
    final active = deliveries.where((d) => d['status'] == 'DISPATCHED').toList();
    final done = deliveries.where((d) => d['status'] == 'DELIVERED').toList();
    final store = _data?['store'] as Json?;
    return Scaffold(
      backgroundColor: AppColors.slate100,
      appBar: AppBar(
        backgroundColor: AppColors.ink,
        foregroundColor: Colors.white,
        titleTextStyle: Theme.of(context).appBarTheme.titleTextStyle?.copyWith(color: Colors.white),
        title: Text('MGK Rider · ${user?.firstName ?? ''}'),
        actions: [IconButton(onPressed: () => context.read<AuthState>().logout(), icon: const Icon(Icons.logout), tooltip: 'Sign out')],
      ),
      body: _data == null
          ? (_error != null ? ErrorRetry(error: _error!, onRetry: _load) : const Center(child: CircularProgressIndicator()))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(padding: const EdgeInsets.all(16), children: [
                Text('Your deliveries', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                if (active.isEmpty)
                  const CardBox(child: EmptyState(icon: Icons.navigation_outlined, title: 'No deliveries right now', message: 'New deliveries appear here automatically when the pharmacy sends them out to you.'))
                else
                  for (final d in active)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: _DeliveryCard(key: ValueKey(d['number']), d: d, store: LatLng((store!['lat'] as num).toDouble(), (store['lng'] as num).toDouble()), canSimulate: _data!['canSimulate'] == true && AppConfig.devTools, onDone: _load),
                    ),
                if (done.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  const Text('DELIVERED TODAY', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1, color: AppColors.inkMuted)),
                  const SizedBox(height: 8),
                  for (final d in done)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: CardBox(
                        child: Row(children: [
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(d['number'] as String, maxLines: 1, style: const TextStyle(fontWeight: FontWeight.w700))), Text('${(d['customer'] as Json)['firstName']} · ${(d['address'] as Json)['city']}', style: const TextStyle(color: AppColors.inkMuted))])),
                          const Icon(Icons.check_circle_outline, color: AppColors.care600, size: 18),
                          const SizedBox(width: 4),
                          Text(fmtDateTime(d['deliveredAt'] as String?), style: const TextStyle(color: AppColors.care700, fontSize: 12.5)),
                        ]),
                      ),
                    ),
                ],
              ]),
            ),
    );
  }
}

class _DeliveryCard extends StatefulWidget {
  const _DeliveryCard({super.key, required this.d, required this.store, required this.canSimulate, required this.onDone});
  final Json d;
  final LatLng store;
  final bool canSimulate;
  final Future<void> Function() onDone;
  @override
  State<_DeliveryCard> createState() => _DeliveryCardState();
}

class _DeliveryCardState extends State<_DeliveryCard> {
  StreamSubscription<Position>? _sub;
  LatLng? _me;
  double? _heading;
  String? _gpsError;
  bool _simulating = false, _busy = false;
  final _code = TextEditingController();
  String? _codeError;

  String get _number => widget.d['number'] as String;

  @override
  void dispose() {
    // Stop GPS and release the screen wake lock, without rebuilding a widget that is going away.
    _sub?.cancel();
    _sub = null;
    WakelockPlus.disable();
    super.dispose();
  }

  Future<void> _start() async {
    setState(() => _gpsError = null);
    if (!await Geolocator.isLocationServiceEnabled()) return setState(() => _gpsError = 'Turn on location (GPS) on this phone.');
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
    if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
      return setState(() => _gpsError = 'Location permission was denied. Allow location for MGK Pharmacy in Settings.');
    }
    await WakelockPlus.enable(); // keep the screen on so location keeps flowing while riding
    _sub = Geolocator.getPositionStream(locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 10)).listen((pos) async {
      setState(() {
        _me = LatLng(pos.latitude, pos.longitude);
        _heading = pos.heading >= 0 ? pos.heading : null;
      });
      try {
        final res = await api.post('/rider/deliveries/$_number/location', {
          'lat': pos.latitude,
          'lng': pos.longitude,
          'heading': pos.heading >= 0 ? pos.heading : null,
          'speed': pos.speed >= 0 ? pos.speed : null,
          'accuracy': pos.accuracy,
        });
        if (res['stopSharing'] == true) _stop();
      } catch (_) {
        // weak signal: the next position update will try again
      }
    }, onError: (_) => setState(() => _gpsError = 'Waiting for GPS signal…'));
    setState(() {});
  }

  void _stop() {
    _sub?.cancel();
    _sub = null;
    WakelockPlus.disable();
    if (mounted) setState(() {});
  }

  Future<void> _confirm() async {
    setState(() {
      _busy = true;
      _codeError = null;
    });
    try {
      await api.post('/rider/deliveries/$_number/delivered', {'code': _code.text.trim()});
      _stop();
      if (mounted) snack(context, 'Delivery confirmed. Great job!');
      await widget.onDone();
    } on ApiException catch (e) {
      setState(() => _codeError = e.fields['code'] ?? e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.d;
    final customer = d['customer'] as Json;
    final address = d['address'] as Json;
    final dest = d['destination'] as Json?;
    final destPoint = dest == null ? null : LatLng((dest['lat'] as num).toDouble(), (dest['lng'] as num).toDouble());
    final sharing = _sub != null;
    final directions = destPoint != null
        ? 'https://www.google.com/maps/dir/?api=1&destination=${destPoint.latitude},${destPoint.longitude}&travelmode=driving'
        : 'https://www.google.com/maps/search/?api=1&query=${Uri.encodeComponent([address['line1'], address['city'], address['state'], 'Nigeria'].whereType<String>().join(', '))}';

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(_number, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.inkMuted)),
                Text('${customer['firstName']} ${customer['lastName']}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                Text('${address['line1']}${address['line2'] != null ? ', ${address['line2']}' : ''}, ${address['city']}', style: const TextStyle(color: AppColors.inkSoft)),
                if (address['landmark'] != null) Text('Landmark: ${address['landmark']}', style: const TextStyle(color: AppColors.inkMuted)),
                Text(plural((d['itemCount'] as num).toInt(), 'item'), style: const TextStyle(fontSize: 12, color: AppColors.inkMuted)),
              ]),
            ),
            Pill(sharing ? 'Live' : 'Not sharing', bg: sharing ? AppColors.care100 : AppColors.slate100, fg: sharing ? AppColors.care700 : AppColors.inkSoft, icon: Icons.sensors),
          ]),
        ),
        if (d['requiresId'] == true) const Padding(padding: EdgeInsets.fromLTRB(16, 0, 16, 10), child: AlertBox(tone: AlertTone.warning, message: "Contains a controlled medicine. Check the recipient's ID.")),
        if (d['notes'] != null) Padding(padding: const EdgeInsets.fromLTRB(16, 0, 16, 10), child: AlertBox(message: 'Customer note: ${d['notes']}')),
        MgkMap(
          height: 220,
          borderRadius: 0,
          pins: [MapPin(PinKind.store, widget.store), if (destPoint != null) MapPin(PinKind.home, destPoint), if (_me != null) MapPin(PinKind.rider, _me!, heading: _heading)],
          fitKey: '${_me != null}-${destPoint != null}',
        ),
        if (dest != null && dest['source'] != 'PIN') Container(color: AppColors.amber50, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8), child: const Text('Approximate location. Call the customer for directions.', style: TextStyle(fontSize: 12.5, color: AppColors.amber800))),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              Expanded(child: OutlinedButton.icon(onPressed: () => openLink('tel:${customer['phone']}'), icon: const Icon(Icons.call_outlined), label: const Text('Call'))),
              const SizedBox(width: 10),
              Expanded(child: OutlinedButton.icon(onPressed: () => openLink(directions), icon: const Icon(Icons.navigation_outlined), label: const Text('Directions'))),
            ]),
            const SizedBox(height: 10),
            sharing
                ? FilledButton.icon(style: FilledButton.styleFrom(backgroundColor: AppColors.ink), onPressed: _stop, icon: const Icon(Icons.stop_circle_outlined), label: const Text('Stop sharing location'))
                : FilledButton.icon(style: FilledButton.styleFrom(backgroundColor: AppColors.care600, minimumSize: const Size(10, 54)), onPressed: _start, icon: const Icon(Icons.play_circle_outline), label: const Text('Start trip: share my location')),
            if (_gpsError != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(_gpsError!, style: const TextStyle(color: AppColors.orange800))),
            if (widget.canSimulate)
              TextButton(
                onPressed: _simulating
                    ? null
                    : () async {
                        setState(() => _simulating = true);
                        await runAction(context, () => api.post('/rider/deliveries/$_number/simulate'), success: 'Simulated drive started (about 90 seconds)');
                      },
                child: Text(_simulating ? 'Simulated drive running…' : 'Demo only: simulate this drive', style: const TextStyle(color: AppColors.inkMuted)),
              ),
          ]),
        ),
        Container(
          color: AppColors.slate50,
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const Text("Delivered? Enter the customer's 4-digit code", style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(
                child: TextField(
                  controller: _code,
                  keyboardType: TextInputType.number,
                  maxLength: 4,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 22, letterSpacing: 10, fontWeight: FontWeight.w800),
                  decoration: InputDecoration(counterText: '', hintText: '••••', errorText: _codeError),
                  onChanged: (_) => setState(() {}),
                ),
              ),
              const SizedBox(width: 10),
              FilledButton.icon(onPressed: _busy || _code.text.length != 4 ? null : _confirm, icon: const Icon(Icons.check_circle_outline), label: const Text('Confirm')),
            ]),
          ]),
        ),
      ]),
    );
  }
}
