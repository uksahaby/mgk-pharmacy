import 'dart:async';

import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/models.dart';
import '../core/theme.dart';
import 'common.dart';
import 'map_view.dart';

/// Live rider map for an order on its way. Polls the same tracking endpoint as the website every 4 seconds.
class LiveTracking extends StatefulWidget {
  const LiveTracking({super.key, required this.number, this.accessKey, this.code, this.staff = false, this.onStatusChange});
  final String number;
  final String? accessKey;
  final String? code;
  final bool staff;
  final VoidCallback? onStatusChange;
  @override
  State<LiveTracking> createState() => _LiveTrackingState();
}

class _LiveTrackingState extends State<LiveTracking> {
  Tracking? _t;
  Timer? _poll;
  Timer? _tick;
  bool _finishNotified = false;

  @override
  void initState() {
    super.initState();
    _load();
    _poll = Timer.periodic(const Duration(seconds: 4), (_) => _load());
    _tick = Timer.periodic(const Duration(seconds: 1), (_) => mounted ? setState(() {}) : null);
  }

  @override
  void dispose() {
    _poll?.cancel();
    _tick?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final t = Tracking(await api.get('/orders/${widget.number}/tracking', query: {'key': widget.accessKey}));
      if (!mounted) return;
      // The delivery finished (or was cancelled): refresh the order page so this card is replaced.
      // Checked on every poll, not only on a change, because the card can be rebuilt after scrolling.
      if (t.status != 'DISPATCHED' && !_finishNotified) {
        _finishNotified = true;
        widget.onStatusChange?.call();
      }
      setState(() => _t = t);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final t = _t;
    final pos = t?.position;
    final pins = <MapPin>[
      if (t != null) MapPin(PinKind.store, LatLng(t.origin.lat, t.origin.lng)),
      if (t?.destination != null) MapPin(PinKind.home, LatLng(t!.destination!.lat, t.destination!.lng)),
      if (pos != null) MapPin(PinKind.rider, LatLng((pos['lat'] as num).toDouble(), (pos['lng'] as num).toDouble()), heading: (pos['heading'] as num?)?.toDouble()),
    ];
    final rider = t?.rider;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(color: AppColors.care50, borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.delivery_dining, color: AppColors.care600),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(widget.staff ? 'Live delivery' : 'Your order is on its way', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                Text('${rider != null ? '${rider['firstName']} is bringing your order' : 'Rider assigned'}${pos != null ? ' · updated ${ago(pos['at'] as String)}' : ''}',
                    style: const TextStyle(color: AppColors.inkMuted, fontSize: 12.5)),
              ]),
            ),
            if (t?.etaMinutes != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(color: AppColors.ink, borderRadius: BorderRadius.circular(12)),
                child: Column(children: [
                  const Text('ARRIVING IN', style: TextStyle(color: Colors.white54, fontSize: 9, letterSpacing: 1)),
                  Text('${t!.etaMinutes} min', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
                ]),
              ),
          ]),
        ),
        Stack(children: [
          MgkMap(
            height: 320,
            borderRadius: 0,
            pins: pins,
            trail: t?.trail.map((p) => LatLng(p[0], p[1])).toList() ?? const [],
            guide: pos != null && t?.destination != null ? [LatLng((pos['lat'] as num).toDouble(), (pos['lng'] as num).toDouble()), LatLng(t!.destination!.lat, t.destination!.lng)] : const [],
            fitKey: t == null ? null : '${pos != null}-${t.destination != null}',
          ),
          if (t != null && t.live && pos == null)
            const Positioned(left: 12, right: 12, bottom: 12, child: AlertBox(tone: AlertTone.warning, message: "Waiting for the rider's location. It appears as soon as they set off.")),
          if (t?.stale == true)
            const Positioned(left: 12, right: 12, bottom: 12, child: AlertBox(tone: AlertTone.warning, message: "The rider's phone hasn't updated for a moment (weak signal). Showing the last known position.")),
        ]),
        Padding(
          padding: const EdgeInsets.all(14),
          child: Column(children: [
            if (widget.code != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: widget.staff ? AppColors.slate50 : AppColors.brand50, borderRadius: BorderRadius.circular(14)),
                child: Row(children: [
                  const Icon(Icons.key_outlined, color: AppColors.brand600),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Delivery code', style: TextStyle(fontSize: 12, color: AppColors.inkMuted)),
                      Text(widget.code!.split('').join(' '), style: const TextStyle(fontFamily: 'monospace', fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: 4)),
                      if (!widget.staff) const Text('Give it to the rider only when you have your package.', style: TextStyle(fontSize: 11.5, color: AppColors.inkMuted)),
                    ]),
                  ),
                ]),
              ),
            if (rider?['phone'] != null) ...[
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => openLink('tel:${rider['phone']}'),
                  icon: const Icon(Icons.call_outlined, color: AppColors.care600),
                  label: Text('Call ${rider!['firstName']} · ${fmtPhone(rider['phone'] as String)}'),
                ),
              ),
            ],
            if (t?.destinationSource != null && t!.destinationSource != 'PIN')
              const Padding(padding: EdgeInsets.only(top: 10), child: AlertBox(tone: AlertTone.warning, message: 'Your pin is approximate. The rider will call if they need directions.')),
          ]),
        ),
      ]),
    );
  }
}
