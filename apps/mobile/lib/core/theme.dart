import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Same palette as the website (tailwind.config.ts).
class AppColors {
  static const brand50 = Color(0xFFFFF1F2);
  static const brand100 = Color(0xFFFFE1E3);
  static const brand200 = Color(0xFFFFC8CC);
  static const brand300 = Color(0xFFFFA0A7);
  static const brand500 = Color(0xFFF43A4A);
  static const brand600 = Color(0xFFD71F33);
  static const brand700 = Color(0xFFB3152A);
  static const brand800 = Color(0xFF941528);
  static const ink = Color(0xFF0F172A);
  static const inkSoft = Color(0xFF334155);
  static const inkMuted = Color(0xFF64748B);
  static const canvas = Color(0xFFF7F7F5);
  static const border = Color(0xFFE2E8F0);

  /// Hairline used by the app's cards and fields (lighter than [border]).
  static const line = Color(0xFFEEF0F3);
  static const hint = Color(0xFF9CA3AF);
  static const slate50 = Color(0xFFF8FAFC);
  static const slate100 = Color(0xFFF1F5F9);
  static const care50 = Color(0xFFECFDF5);
  static const care100 = Color(0xFFD1FAE5);
  static const care500 = Color(0xFF10B981);
  static const care600 = Color(0xFF059669);
  static const care700 = Color(0xFF047857);
  static const amber50 = Color(0xFFFFFBEB);
  static const amber100 = Color(0xFFFEF3C7);
  static const amber800 = Color(0xFF92400E);
  static const orange100 = Color(0xFFFFEDD5);
  static const orange800 = Color(0xFF9A3412);
  static const sky50 = Color(0xFFF0F9FF);
  static const sky100 = Color(0xFFE0F2FE);
  static const sky800 = Color(0xFF075985);
  static const indigo100 = Color(0xFFE0E7FF);
  static const indigo800 = Color(0xFF3730A3);
  static const violet100 = Color(0xFFEDE9FE);
  static const violet800 = Color(0xFF5B21B6);
}

ThemeData buildTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(seedColor: AppColors.brand600, primary: AppColors.brand600, surface: Colors.white),
    scaffoldBackgroundColor: Colors.white,
  );
  final body = GoogleFonts.interTextTheme(base.textTheme).apply(bodyColor: AppColors.ink, displayColor: AppColors.ink);
  TextStyle? display(TextStyle? s) => s == null ? null : GoogleFonts.plusJakartaSans(textStyle: s, fontWeight: FontWeight.w800, letterSpacing: -0.4);

  return base.copyWith(
    textTheme: body.copyWith(
      displaySmall: display(body.displaySmall),
      headlineLarge: display(body.headlineLarge),
      headlineMedium: display(body.headlineMedium),
      headlineSmall: display(body.headlineSmall),
      titleLarge: display(body.titleLarge),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: AppColors.ink,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: false,
      titleTextStyle: GoogleFonts.plusJakartaSans(fontSize: 19, fontWeight: FontWeight.w800, color: AppColors.ink),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: AppColors.line),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.brand600,
        foregroundColor: Colors.white,
        minimumSize: const Size(48, 50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.ink,
        minimumSize: const Size(48, 48),
        side: const BorderSide(color: Color(0xFFE5E7EB)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    ),
    textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(foregroundColor: AppColors.brand700)),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      hintStyle: const TextStyle(color: AppColors.hint, fontSize: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.brand500, width: 1.6),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.brand500),
      ),
      labelStyle: const TextStyle(color: AppColors.inkSoft),
    ),
    chipTheme: base.chipTheme.copyWith(shape: const StadiumBorder(), side: BorderSide.none),
    // Phone-app tab bar: no pill behind the icon; the selected tab is shown in brand red.
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.white,
      indicatorColor: Colors.transparent,
      elevation: 0,
      height: 64,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      iconTheme: WidgetStateProperty.resolveWith((s) => IconThemeData(size: 24, color: s.contains(WidgetState.selected) ? AppColors.brand600 : AppColors.inkMuted)),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (s) => GoogleFonts.inter(fontSize: 10.5, letterSpacing: -0.2, fontWeight: FontWeight.w600, color: s.contains(WidgetState.selected) ? AppColors.brand600 : AppColors.inkMuted),
      ),
    ),
    dividerTheme: const DividerThemeData(color: AppColors.slate100, space: 1),
  );
}
