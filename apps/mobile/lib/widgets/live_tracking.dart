import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:latlong2/latlong.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/models.dart';
import '../core/theme.dart';
import 'common.dart';
import 'map_view.dart';
import 'ui.dart';

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
    final riderName = rider?['firstName'] as String?;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Stack(
            children: [
              MgkMap(
                height: 240,
                borderRadius: 0,
                scrollFriendly: true,
                pins: pins,
                trail: t?.trail.map((p) => LatLng(p[0], p[1])).toList() ?? const [],
                guide: pos != null && t?.destination != null ? [LatLng((pos['lat'] as num).toDouble(), (pos['lng'] as num).toDouble()), LatLng(t!.destination!.lat, t.destination!.lng)] : const [],
                fitKey: t == null ? null : '${pos != null}-${t.destination != null}',
              ),
              if (t != null && t.live && pos == null)
                const Positioned(
                  left: 10,
                  right: 10,
                  bottom: 10,
                  child: AlertBox(tone: AlertTone.warning, message: "Waiting for the rider's location. It appears as soon as they set off."),
                ),
              if (t?.stale == true)
                const Positioned(
                  left: 10,
                  right: 10,
                  bottom: 10,
                  child: AlertBox(tone: AlertTone.warning, message: "The rider's phone hasn't updated for a moment (weak signal). Showing the last known position."),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Panel(
          child: Column(
            children: [
              // Rider
              Row(
                children: [
                  CircleAvatar(
                    radius: 22,
                    backgroundColor: AppColors.brand50,
                    child: riderName == null
                        ? const Icon(Icons.delivery_dining_rounded, color: AppColors.brand600)
                        : Text(
                            riderName[0],
                            style: const TextStyle(color: AppColors.brand700, fontWeight: FontWeight.w800),
                          ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(riderName ?? 'Rider assigned', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                        Text(widget.staff ? 'Delivery rider' : 'Your delivery rider', style: const TextStyle(color: AppColors.inkMuted, fontSize: 12.5)),
                      ],
                    ),
                  ),
                  if (rider?['phone'] != null)
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(minimumSize: const Size(0, 38), padding: const EdgeInsets.symmetric(horizontal: 14)),
                      onPressed: () => openLink('tel:${rider!['phone']}'),
                      icon: const Icon(Icons.call_outlined, size: 18, color: AppColors.brand600),
                      label: const Text('Call'),
                    ),
                ],
              ),
              const Divider(height: 24, color: AppColors.line),
              // Live location + arrival time, and the delivery code
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(shape: BoxShape.circle, color: pos != null ? AppColors.care500 : AppColors.hint),
                            ),
                            const SizedBox(width: 6),
                            Text(pos != null ? 'Live location · ${ago(pos['at'] as String)}' : 'Live location', style: const TextStyle(fontSize: 12.5, color: AppColors.inkMuted)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          t?.etaMinutes != null ? 'Arriving in ${t!.etaMinutes} min' : 'On the way',
                          style: GoogleFonts.plusJakartaSans(color: AppColors.brand600, fontWeight: FontWeight.w800, fontSize: 19),
                        ),
                      ],
                    ),
                  ),
                  if (widget.code != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.slate50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.line),
                      ),
                      child: Column(
                        children: [
                          const Text('Delivery code', style: TextStyle(fontSize: 11, color: AppColors.inkMuted)),
                          Text(widget.code!, style: GoogleFonts.plusJakartaSans(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: 3)),
                        ],
                      ),
                    ),
                ],
              ),
              if (widget.code != null && !widget.staff)
                const Padding(
                  padding: EdgeInsets.only(top: 10),
                  child: Text('Give the code to the rider only when you have your package.', style: TextStyle(fontSize: 12, color: AppColors.inkMuted)),
                ),
              if (t?.destinationSource != null && t!.destinationSource != 'PIN')
                const Padding(
                  padding: EdgeInsets.only(top: 10),
                  child: AlertBox(tone: AlertTone.warning, message: 'Your pin is approximate. The rider will call if they need directions.'),
                ),
            ],
          ),
        ),
      ],
    );
  }
}
