import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../core/theme.dart';

enum PinKind { store, home, rider, me }

class MapPin {
  const MapPin(this.kind, this.point, {this.heading});
  final PinKind kind;
  final LatLng point;
  final double? heading;
}

/// OpenStreetMap map with the same markers as the website (pharmacy, home, rider).
class MgkMap extends StatefulWidget {
  const MgkMap({super.key, required this.pins, this.trail = const [], this.guide = const [], this.height = 300, this.onTap, this.fitKey, this.borderRadius = 18, this.scrollFriendly = false});
  final List<MapPin> pins;
  final List<LatLng> trail;
  final List<LatLng> guide;
  final double height;
  final void Function(LatLng)? onTap;
  /// Change to re-fit the camera to all pins.
  final String? fitKey;
  final double borderRadius;
  /// Inside a scrolling page: one-finger drags scroll the page, not the map (pinch to zoom, tap still works).
  final bool scrollFriendly;

  @override
  State<MgkMap> createState() => _MgkMapState();
}

class _MgkMapState extends State<MgkMap> {
  final _controller = MapController();
  String? _lastFit;
  bool _ready = false;

  void _fit() {
    if (!_ready || widget.pins.isEmpty || widget.fitKey == _lastFit) return;
    _lastFit = widget.fitKey;
    if (widget.pins.length == 1) {
      _controller.move(widget.pins.first.point, 16);
    } else {
      _controller.fitCamera(CameraFit.coordinates(coordinates: widget.pins.map((p) => p.point).toList(), padding: const EdgeInsets.all(48), maxZoom: 16));
    }
  }

  @override
  void didUpdateWidget(covariant MgkMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    WidgetsBinding.instance.addPostFrameCallback((_) => _fit());
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(widget.borderRadius),
      child: SizedBox(
        height: widget.height,
        child: FlutterMap(
          mapController: _controller,
          options: MapOptions(
            initialCenter: widget.pins.isNotEmpty ? widget.pins.first.point : const LatLng(12.0, 8.55),
            initialZoom: 13,
            onTap: widget.onTap == null ? null : (_, p) => widget.onTap!(p),
            onMapReady: () {
              _ready = true;
              _fit();
            },
            interactionOptions: InteractionOptions(
              flags: widget.scrollFriendly ? InteractiveFlag.pinchZoom | InteractiveFlag.doubleTapZoom : InteractiveFlag.all & ~InteractiveFlag.rotate,
            ),
          ),
          children: [
            TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'com.mgkpharmacy.mgk_pharmacy'),
            if (widget.trail.length > 1) PolylineLayer(polylines: [Polyline(points: widget.trail, color: AppColors.brand600, strokeWidth: 5)]),
            if (widget.guide.length > 1)
              PolylineLayer(polylines: [Polyline(points: widget.guide, color: AppColors.ink.withValues(alpha: 0.5), strokeWidth: 3, pattern: StrokePattern.dashed(segments: const [8, 8]))]),
            MarkerLayer(markers: [
              for (final p in widget.pins)
                Marker(
                  point: p.point,
                  width: 44,
                  height: 44,
                  alignment: p.kind == PinKind.rider || p.kind == PinKind.me ? Alignment.center : Alignment.topCenter,
                  child: _marker(p),
                ),
            ]),
            const RichAttributionWidget(attributions: [TextSourceAttribution('OpenStreetMap contributors')]),
          ],
        ),
      ),
    );
  }

  Widget _marker(MapPin p) {
    switch (p.kind) {
      case PinKind.store:
      case PinKind.home:
        return Transform.rotate(
          angle: math.pi / 4,
          child: Container(
            margin: const EdgeInsets.all(5),
            decoration: BoxDecoration(
              color: p.kind == PinKind.store ? AppColors.brand600 : AppColors.ink,
              borderRadius: const BorderRadius.only(topLeft: Radius.circular(99), topRight: Radius.circular(99), bottomLeft: Radius.circular(99)),
              border: Border.all(color: Colors.white, width: 3),
              boxShadow: const [BoxShadow(color: Color(0x330F172A), blurRadius: 10, offset: Offset(0, 4))],
            ),
            child: Transform.rotate(
              angle: -math.pi / 4,
              child: Icon(p.kind == PinKind.store ? Icons.add : Icons.home_rounded, color: Colors.white, size: 17),
            ),
          ),
        );
      case PinKind.rider:
        return Container(
          decoration: BoxDecoration(
            color: AppColors.care600,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 3),
            boxShadow: [BoxShadow(color: AppColors.care500.withValues(alpha: 0.45), blurRadius: 16, spreadRadius: 4)],
          ),
          child: Transform.rotate(angle: (p.heading ?? 0) * math.pi / 180, child: const Icon(Icons.navigation_rounded, color: Colors.white, size: 20)),
        );
      case PinKind.me:
        return Center(
          child: Container(
            width: 18,
            height: 18,
            decoration: BoxDecoration(color: const Color(0xFF0EA5E9), shape: BoxShape.circle, border: Border.all(color: const Color(0xFFBAE6FD), width: 4)),
          ),
        );
    }
  }
}
