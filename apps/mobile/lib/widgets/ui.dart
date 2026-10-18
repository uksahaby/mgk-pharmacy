import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../core/theme.dart';
import '../state/cart_state.dart';

/* Building blocks for the phone-app look: compact headers, labelled fields, list rows and icon tiles. */

/// The MGK mark (red rounded square with a white cross) and the "MGK Pharmacy" wordmark.
class BrandLogo extends StatelessWidget {
  const BrandLogo({super.key, this.size = 40, this.light = false, this.stacked = false});
  final double size;
  final bool light; // white text, for dark/red backgrounds
  final bool stacked; // wordmark on two lines, larger (splash)

  @override
  Widget build(BuildContext context) {
    final mark = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: light ? Colors.white : AppColors.brand600,
        borderRadius: BorderRadius.circular(size * 0.28),
        boxShadow: light ? null : [BoxShadow(color: AppColors.brand600.withValues(alpha: 0.25), blurRadius: 12, offset: const Offset(0, 4))],
      ),
      child: Icon(Icons.add_rounded, color: light ? AppColors.brand600 : Colors.white, size: size * 0.72),
    );
    final fg = light ? Colors.white : AppColors.ink;
    final word = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          'MGK',
          style: GoogleFonts.plusJakartaSans(fontSize: size * (stacked ? 0.78 : 0.5), height: 1, fontWeight: FontWeight.w800, color: fg, letterSpacing: -0.5),
        ),
        Text(
          'Pharmacy',
          style: GoogleFonts.plusJakartaSans(fontSize: size * (stacked ? 0.5 : 0.34), height: 1.15, fontWeight: FontWeight.w600, color: light ? Colors.white70 : AppColors.brand600),
        ),
      ],
    );
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        mark,
        SizedBox(width: size * 0.28),
        word,
      ],
    );
  }
}

/// Cart icon with a count badge, for app bars and headers.
class CartButton extends StatelessWidget {
  const CartButton({super.key, this.color});
  final Color? color;
  @override
  Widget build(BuildContext context) {
    final count = context.watch<CartState>().count;
    return IconButton(
      tooltip: 'Cart',
      onPressed: () => context.push('/cart'),
      icon: Badge(
        isLabelVisible: count > 0,
        label: Text('$count'),
        backgroundColor: AppColors.brand600,
        child: Icon(Icons.shopping_cart_outlined, color: color ?? AppColors.ink),
      ),
    );
  }
}

/// A field with its label above it, as in the sign-in and checkout designs.
class LabeledField extends StatelessWidget {
  const LabeledField({super.key, required this.label, required this.child});
  final String label;
  final Widget child;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        label,
        style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: AppColors.inkSoft),
      ),
      const SizedBox(height: 7),
      child,
    ],
  );
}

/// White rounded surface with a hairline border.
class Panel extends StatelessWidget {
  const Panel({super.key, required this.child, this.padding = const EdgeInsets.all(14), this.onTap, this.color, this.borderColor});
  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;
  final Color? color, borderColor;
  @override
  Widget build(BuildContext context) => Material(
    color: color ?? Colors.white,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(14),
      side: BorderSide(color: borderColor ?? AppColors.line),
    ),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onTap,
      child: Padding(padding: padding, child: child),
    ),
  );
}

/// Section heading with an optional "See all →" link.
class SectionHeader extends StatelessWidget {
  const SectionHeader(this.title, {super.key, this.action, this.onAction});
  final String title;
  final String? action;
  final VoidCallback? onAction;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: GoogleFonts.plusJakartaSans(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.ink),
          ),
        ),
        if (action != null)
          InkWell(
            onTap: onAction,
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    action!,
                    style: const TextStyle(color: AppColors.brand600, fontWeight: FontWeight.w600, fontSize: 13.5),
                  ),
                  const SizedBox(width: 2),
                  const Icon(Icons.arrow_forward_rounded, size: 16, color: AppColors.brand600),
                ],
              ),
            ),
          ),
      ],
    ),
  );
}

/// Rounded square holding an icon, used in lists and tiles.
class IconBadge extends StatelessWidget {
  const IconBadge(this.icon, {super.key, this.size = 42, this.bg = AppColors.brand50, this.fg = AppColors.brand600});
  final IconData icon;
  final double size;
  final Color bg, fg;
  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(size * 0.3)),
    child: Icon(icon, color: fg, size: size * 0.5),
  );
}

/// Settings-style row: icon, title, subtitle and a chevron.
class MenuRow extends StatelessWidget {
  const MenuRow({super.key, required this.icon, required this.title, this.subtitle, this.onTap, this.trailing, this.danger = false});
  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onTap;
  final Widget? trailing;
  final bool danger;
  @override
  Widget build(BuildContext context) => Panel(
    onTap: onTap,
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    child: Row(
      children: [
        IconBadge(icon, size: 40, bg: danger ? AppColors.slate100 : AppColors.brand50, fg: danger ? AppColors.inkSoft : AppColors.brand600),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14.5)),
              if (subtitle != null)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(subtitle!, style: const TextStyle(color: AppColors.inkMuted, fontSize: 12.5)),
                ),
            ],
          ),
        ),
        trailing ?? const Icon(Icons.chevron_right_rounded, color: AppColors.hint),
      ],
    ),
  );
}

/// Two-option segmented control (e.g. "Upload new" / "My prescriptions").
class Segmented extends StatelessWidget {
  const Segmented({super.key, required this.options, required this.index, required this.onChanged});
  final List<String> options;
  final int index;
  final ValueChanged<int> onChanged;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(4),
    decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(12)),
    child: Row(
      children: [
        for (var i = 0; i < options.length; i++)
          Expanded(
            child: GestureDetector(
              onTap: () => onChanged(i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(color: i == index ? AppColors.brand600 : Colors.transparent, borderRadius: BorderRadius.circular(9)),
                alignment: Alignment.center,
                child: Text(
                  options[i],
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5, color: i == index ? Colors.white : AppColors.inkSoft),
                ),
              ),
            ),
          ),
      ],
    ),
  );
}

/// Scrollable row of filter chips (All, Processing, Delivered…).
class ChipTabs extends StatelessWidget {
  const ChipTabs({super.key, required this.labels, required this.index, required this.onChanged, this.padding = const EdgeInsets.symmetric(horizontal: 16)});
  final List<String> labels;
  final int index;
  final ValueChanged<int> onChanged;
  final EdgeInsets padding;
  @override
  Widget build(BuildContext context) => SizedBox(
    height: 38,
    child: ListView.separated(
      scrollDirection: Axis.horizontal,
      padding: padding,
      itemCount: labels.length,
      separatorBuilder: (_, _) => const SizedBox(width: 8),
      itemBuilder: (_, i) {
        final on = i == index;
        return InkWell(
          onTap: () => onChanged(i),
          borderRadius: BorderRadius.circular(99),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: on ? AppColors.brand600 : Colors.white,
              borderRadius: BorderRadius.circular(99),
              border: Border.all(color: on ? AppColors.brand600 : const Color(0xFFE5E7EB)),
            ),
            child: Text(
              labels[i],
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: on ? Colors.white : AppColors.inkSoft),
            ),
          ),
        );
      },
    ),
  );
}

/// Shown on tabs that need an account (Orders, Prescriptions) when nobody is signed in.
class SignInPrompt extends StatelessWidget {
  const SignInPrompt({super.key, required this.icon, required this.title, required this.message, required this.next});
  final IconData icon;
  final String title, message, next;
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconBadge(icon, size: 72),
          const SizedBox(height: 18),
          Text(
            title,
            textAlign: TextAlign.center,
            style: GoogleFonts.plusJakartaSans(fontSize: 20, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.inkMuted, height: 1.45),
          ),
          const SizedBox(height: 22),
          SizedBox(
            width: double.infinity,
            child: FilledButton(onPressed: () => context.push('/login?next=${Uri.encodeComponent(next)}'), child: const Text('Sign in')),
          ),
          const SizedBox(height: 8),
          TextButton(onPressed: () => context.push('/register?next=${Uri.encodeComponent(next)}'), child: const Text('Create an account')),
        ],
      ),
    ),
  );
}

/// Small status line with an icon in a tinted circle (e.g. "Approved · 10 Apr").
class StatusIcon extends StatelessWidget {
  const StatusIcon(this.icon, {super.key, required this.color});
  final IconData icon;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    width: 34,
    height: 34,
    decoration: BoxDecoration(color: color.withValues(alpha: 0.12), shape: BoxShape.circle),
    child: Icon(icon, color: color, size: 19),
  );
}
