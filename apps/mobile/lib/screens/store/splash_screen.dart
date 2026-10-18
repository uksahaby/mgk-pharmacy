import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme.dart';
import '../../widgets/ui.dart';

/// Opening screen while the app checks the saved sign-in: brand panel with a curved edge, then three promises.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  static const _promises = [
    (Icons.verified_outlined, 'Authentic products', '100% genuine, NAFDAC-registered medicines'),
    (Icons.medical_services_outlined, 'Licensed pharmacists', 'Every prescription checked by a pharmacist'),
    (Icons.local_shipping_outlined, 'Fast, reliable delivery', 'Same day in Kano, nationwide in days'),
  ];

  @override
  Widget build(BuildContext context) {
    final h = MediaQuery.sizeOf(context).height;
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light, // white status-bar icons over the red panel
      child: Scaffold(
        backgroundColor: Colors.white,
        body: Column(
          children: [
            ClipPath(
              clipper: _CurveClipper(),
              child: Container(
                height: h * 0.56,
                width: double.infinity,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [AppColors.brand600, AppColors.brand800]),
                ),
                child: SafeArea(
                  bottom: false,
                  child: Stack(
                    children: [
                      // Soft background crosses, echoing the logo.
                      Positioned(right: -40, top: 20, child: Icon(Icons.add_rounded, size: 220, color: Colors.white.withValues(alpha: 0.06))),
                      Positioned(left: -30, bottom: 40, child: Icon(Icons.add_rounded, size: 140, color: Colors.white.withValues(alpha: 0.05))),
                      Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const BrandLogo(size: 64, light: true, stacked: true),
                            const SizedBox(height: 26),
                            Text(
                              'Quality Medicines.\nBetter Health.',
                              textAlign: TextAlign.center,
                              style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 19, height: 1.35, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Expanded(
              child: SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(28, 8, 28, 16),
                  child: Column(
                    children: [
                      for (final (icon, title, sub) in _promises)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 18),
                          child: Row(
                            children: [
                              Container(
                                width: 48,
                                height: 48,
                                decoration: const BoxDecoration(color: AppColors.brand50, shape: BoxShape.circle),
                                child: Icon(icon, color: AppColors.brand600),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                                    Text(sub, style: const TextStyle(color: AppColors.inkMuted, fontSize: 12.5)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      const Spacer(),
                      const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4)),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CurveClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size s) => Path()
    ..lineTo(0, s.height - 70)
    ..quadraticBezierTo(s.width * 0.28, s.height + 10, s.width * 0.62, s.height - 38)
    ..quadraticBezierTo(s.width * 0.86, s.height - 70, s.width, s.height - 22)
    ..lineTo(s.width, 0)
    ..close();
  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}
