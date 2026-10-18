import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/theme.dart';

const _slideDuration = Duration(seconds: 6);

class _Slide {
  const _Slide(this.title, this.body, this.cta, this.route, this.badge);
  final String title, body, cta, route;
  final IconData badge;
}

const _slides = [
  _Slide('Your health,\nour priority', 'Genuine medicines, pharmacist-checked.', 'Shop Now', '/shop', Icons.verified_user_outlined),
  _Slide('Upload your\nprescription', 'Reviewed in about 2 hours.', 'Upload', '/prescriptions', Icons.description_outlined),
  _Slide('Track your\nrider live', 'Watch it arrive on the map.', 'Start an order', '/shop', Icons.delivery_dining_outlined),
];

/// Home banner: red card with the MGK storefront photo on the right and three auto-advancing messages.
/// Swipe to change; the pause button stops it; no motion when the phone asks for reduced motion.
class HeroSlider extends StatefulWidget {
  const HeroSlider({super.key});
  @override
  State<HeroSlider> createState() => _HeroSliderState();
}

class _HeroSliderState extends State<HeroSlider> with SingleTickerProviderStateMixin {
  late final AnimationController _progress = AnimationController(vsync: this, duration: _slideDuration)
    ..addStatusListener((s) {
      if (s == AnimationStatus.completed) _go(_active + 1);
    });
  int _active = 0;
  bool _paused = false;

  bool get _reduceMotion => MediaQuery.of(context).disableAnimations;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_reduceMotion) {
      _progress.stop();
    } else if (!_paused && !_progress.isAnimating) {
      _progress.forward();
    }
  }

  @override
  void dispose() {
    _progress.dispose();
    super.dispose();
  }

  void _go(int i) {
    setState(() => _active = (i + _slides.length) % _slides.length);
    _progress.value = 0;
    if (!_paused && !_reduceMotion) _progress.forward();
  }

  void _togglePause() {
    setState(() => _paused = !_paused);
    _paused || _reduceMotion ? _progress.stop() : _progress.forward();
  }

  @override
  Widget build(BuildContext context) {
    final s = _slides[_active];
    final scale = MediaQuery.textScalerOf(context).scale(1).clamp(1.0, 1.3);
    return Semantics(
      container: true,
      label: 'Highlights, slide ${_active + 1} of ${_slides.length}',
      child: GestureDetector(
        onHorizontalDragEnd: (d) {
          final v = d.primaryVelocity ?? 0;
          if (v.abs() > 200) _go(_active + (v < 0 ? 1 : -1));
        },
        child: ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: SizedBox(
            height: 178 * scale,
            child: Stack(
              fit: StackFit.expand,
              children: [
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [AppColors.brand600, AppColors.brand800]),
                  ),
                ),
                // Storefront photo on the right, fading into the red.
                Positioned(
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 190,
                  child: ShaderMask(
                    shaderCallback: (r) => const LinearGradient(colors: [Colors.transparent, Colors.black], stops: [0, 0.45]).createShader(r),
                    blendMode: BlendMode.dstIn,
                    child: Image.asset('assets/images/mgk-storefront.webp', fit: BoxFit.cover, alignment: const Alignment(0.35, -0.2), semanticLabel: 'MGK Healthcare storefront in Kano'),
                  ),
                ),
                Positioned(
                  right: 12,
                  top: 12,
                  child: Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white38),
                    ),
                    child: Icon(s.badge, color: Colors.white, size: 18),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 150, 14),
                  child: AnimatedSwitcher(
                    duration: _reduceMotion ? Duration.zero : const Duration(milliseconds: 450),
                    reverseDuration: _reduceMotion ? Duration.zero : const Duration(milliseconds: 150),
                    switchInCurve: const Interval(0.3, 1, curve: Curves.easeOut),
                    layoutBuilder: (current, previous) => Stack(alignment: Alignment.topLeft, children: [...previous, ?current]),
                    transitionBuilder: (child, a) => FadeTransition(opacity: a, child: child),
                    child: Column(
                      key: ValueKey(_active),
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          s.title,
                          style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 20, height: 1.15, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 6),
                        Text(s.body, maxLines: 2, style: const TextStyle(color: Color(0xE6FFFFFF), fontSize: 12.5, height: 1.35)),
                        const Spacer(),
                        Material(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(10),
                            onTap: () => s.route == '/shop' || s.route == '/prescriptions' ? context.go(s.route) : context.push(s.route),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    s.cta,
                                    style: const TextStyle(color: AppColors.brand700, fontWeight: FontWeight.w700, fontSize: 13),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(Icons.arrow_forward_rounded, size: 16, color: AppColors.brand700),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                // Slide dots with progress, plus pause.
                Positioned(
                  right: 12,
                  bottom: 12,
                  child: Row(
                    children: [
                      for (var i = 0; i < _slides.length; i++)
                        GestureDetector(
                          onTap: () => _go(i),
                          child: Semantics(
                            button: true,
                            label: 'Slide ${i + 1}',
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 2.5, vertical: 8),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                width: i == _active ? 22 : 7,
                                height: 7,
                                decoration: BoxDecoration(color: i == _active ? Colors.white : Colors.white54, borderRadius: BorderRadius.circular(9)),
                              ),
                            ),
                          ),
                        ),
                      const SizedBox(width: 4),
                      Semantics(
                        button: true,
                        label: _paused ? 'Play slideshow' : 'Pause slideshow',
                        child: InkWell(
                          onTap: _togglePause,
                          customBorder: const CircleBorder(),
                          child: Padding(
                            padding: const EdgeInsets.all(4),
                            child: Icon(_paused ? Icons.play_arrow_rounded : Icons.pause_rounded, color: Colors.white, size: 18),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
