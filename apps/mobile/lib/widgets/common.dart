import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/api.dart';
import '../core/format.dart';
import '../core/theme.dart';

/* ---------------- Category icons & tones (same mapping as the website) ---------------- */

const _icons = <String, IconData>{
  'thermometer': Icons.thermostat_outlined,
  'bug': Icons.bug_report_outlined,
  'shield': Icons.shield_outlined,
  'heart': Icons.monitor_heart_outlined,
  'droplets': Icons.water_drop_outlined,
  'flask': Icons.science_outlined,
  'wind': Icons.air,
  'leaf': Icons.eco_outlined,
  'baby': Icons.child_friendly_outlined,
  'sparkles': Icons.auto_awesome_outlined,
  'eye': Icons.visibility_outlined,
  'venus': Icons.female,
  'stethoscope': Icons.medical_services_outlined,
  'brain': Icons.psychology_outlined,
  'pill': Icons.medication_outlined,
};

IconData categoryIcon(String icon) => _icons[icon] ?? Icons.medication_outlined;

class Tone {
  const Tone(this.bg, this.fg, this.from, this.to);
  final Color bg, fg, from, to;
}

const _tones = <String, Tone>{
  'thermometer': Tone(Color(0xFFFFF7ED), Color(0xFFEA580C), Color(0xFFFFF7ED), Color(0xFFFED7AA)),
  'bug': Tone(Color(0xFFF7FEE7), Color(0xFF4D7C0F), Color(0xFFF7FEE7), Color(0xFFD9F99D)),
  'shield': Tone(Color(0xFFF0F9FF), Color(0xFF0369A1), Color(0xFFF0F9FF), Color(0xFFBAE6FD)),
  'heart': Tone(Color(0xFFFFF1F2), Color(0xFFE11D48), Color(0xFFFFF1F2), Color(0xFFFECDD3)),
  'droplets': Tone(Color(0xFFEFF6FF), Color(0xFF2563EB), Color(0xFFEFF6FF), Color(0xFFBFDBFE)),
  'flask': Tone(Color(0xFFF0FDFA), Color(0xFF0F766E), Color(0xFFF0FDFA), Color(0xFF99F6E4)),
  'wind': Tone(Color(0xFFECFEFF), Color(0xFF0E7490), Color(0xFFECFEFF), Color(0xFFA5F3FC)),
  'leaf': Tone(Color(0xFFECFDF5), Color(0xFF047857), Color(0xFFECFDF5), Color(0xFFA7F3D0)),
  'baby': Tone(Color(0xFFFDF2F8), Color(0xFFDB2777), Color(0xFFFDF2F8), Color(0xFFFBCFE8)),
  'sparkles': Tone(Color(0xFFFFFBEB), Color(0xFFB45309), Color(0xFFFFFBEB), Color(0xFFFDE68A)),
  'eye': Tone(Color(0xFFEEF2FF), Color(0xFF4F46E5), Color(0xFFEEF2FF), Color(0xFFC7D2FE)),
  'venus': Tone(Color(0xFFFDF4FF), Color(0xFFC026D3), Color(0xFFFDF4FF), Color(0xFFF5D0FE)),
  'stethoscope': Tone(Color(0xFFF1F5F9), Color(0xFF334155), Color(0xFFF8FAFC), Color(0xFFCBD5E1)),
  'brain': Tone(Color(0xFFF5F3FF), Color(0xFF7C3AED), Color(0xFFF5F3FF), Color(0xFFDDD6FE)),
  'pill': Tone(AppColors.brand50, AppColors.brand600, AppColors.brand50, AppColors.brand200),
};

Tone toneFor(String icon) => _tones[icon] ?? _tones['pill']!;

/* ---------------- Pills & badges ---------------- */

class Pill extends StatelessWidget {
  const Pill(this.label, {super.key, required this.bg, required this.fg, this.icon});
  final String label;
  final Color bg, fg;
  final IconData? icon;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(99)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (icon != null) ...[Icon(icon, size: 12, color: fg), const SizedBox(width: 4)],
          Text(label, style: TextStyle(color: fg, fontSize: 11.5, fontWeight: FontWeight.w700)),
        ]),
      );
}

class RxBadge extends StatelessWidget {
  const RxBadge(this.status, {super.key});
  final String status;
  @override
  Widget build(BuildContext context) {
    if (status == 'OTC') return const SizedBox.shrink();
    return status == 'CONTROLLED'
        ? const Pill('Controlled', bg: AppColors.violet100, fg: AppColors.violet800, icon: Icons.gpp_maybe_outlined)
        : const Pill('Rx only', bg: AppColors.amber100, fg: AppColors.amber800, icon: Icons.description_outlined);
  }
}

class ColdChainBadge extends StatelessWidget {
  const ColdChainBadge({super.key});
  @override
  Widget build(BuildContext context) => const Pill('Keep cold', bg: AppColors.sky100, fg: AppColors.sky800, icon: Icons.ac_unit);
}

const _orderTone = {
  'AWAITING_RX_REVIEW': (AppColors.amber100, AppColors.amber800),
  'AWAITING_PAYMENT': (AppColors.orange100, AppColors.orange800),
  'PROCESSING': (AppColors.sky100, AppColors.sky800),
  'READY_FOR_PICKUP': (AppColors.indigo100, AppColors.indigo800),
  'DISPATCHED': (AppColors.indigo100, AppColors.indigo800),
  'DELIVERED': (AppColors.care100, AppColors.care700),
  'COMPLETED': (AppColors.care100, AppColors.care700),
  'CANCELLED': (Color(0xFFE2E8F0), AppColors.inkSoft),
};

class OrderStatusPill extends StatelessWidget {
  const OrderStatusPill(this.status, {super.key});
  final String status;
  @override
  Widget build(BuildContext context) {
    final t = _orderTone[status] ?? (AppColors.slate100, AppColors.inkSoft);
    return Pill(orderStatusLabel[status] ?? status, bg: t.$1, fg: t.$2);
  }
}

const _payTone = {
  'UNPAID': (AppColors.orange100, AppColors.orange800),
  'PROOF_SUBMITTED': (AppColors.amber100, AppColors.amber800),
  'PAID': (AppColors.care100, AppColors.care700),
  'REFUND_PENDING': (AppColors.sky100, AppColors.sky800),
  'REFUNDED': (Color(0xFFE2E8F0), AppColors.inkSoft),
};

class PaymentStatusPill extends StatelessWidget {
  const PaymentStatusPill(this.status, {super.key});
  final String status;
  @override
  Widget build(BuildContext context) {
    final t = _payTone[status] ?? (AppColors.slate100, AppColors.inkSoft);
    return Pill(paymentStatusLabel[status] ?? status, bg: t.$1, fg: t.$2);
  }
}

class ReviewPill extends StatelessWidget {
  const ReviewPill(this.status, {super.key, this.expired = false});
  final String status;
  final bool expired;
  @override
  Widget build(BuildContext context) {
    if (expired) return const Pill('Expired', bg: Color(0xFFE2E8F0), fg: AppColors.inkSoft);
    return switch (status) {
      'PENDING' => const Pill('In review', bg: AppColors.amber100, fg: AppColors.amber800),
      'APPROVED' => const Pill('Approved', bg: AppColors.care100, fg: AppColors.care700),
      'REJECTED' => const Pill('Not accepted', bg: AppColors.brand100, fg: AppColors.brand800),
      _ => const Pill('Not verified', bg: Color(0xFFE2E8F0), fg: AppColors.inkSoft),
    };
  }
}

const _roleTone = {
  'ADMIN': (AppColors.brand100, AppColors.brand800),
  'PHARMACIST': (AppColors.care100, AppColors.care700),
  'SUPPORT': (AppColors.sky100, AppColors.sky800),
  'INVENTORY': (AppColors.amber100, AppColors.amber800),
  'RIDER': (AppColors.indigo100, AppColors.indigo800),
  'CUSTOMER': (AppColors.slate100, AppColors.inkSoft),
};

class RolePill extends StatelessWidget {
  const RolePill(this.role, {super.key});
  final String role;
  @override
  Widget build(BuildContext context) {
    final t = _roleTone[role] ?? (AppColors.slate100, AppColors.inkSoft);
    return Pill(roleLabel[role] ?? role, bg: t.$1, fg: t.$2);
  }
}

/* ---------------- Layout helpers ---------------- */

enum AlertTone { info, success, warning, error }

class AlertBox extends StatelessWidget {
  const AlertBox({super.key, this.tone = AlertTone.info, this.title, this.child, this.message});
  final AlertTone tone;
  final String? title;
  final String? message;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final (bg, border, fg, icon) = switch (tone) {
      AlertTone.info => (AppColors.sky50, const Color(0xFFBAE6FD), const Color(0xFF0C4A6E), Icons.info_outline),
      AlertTone.success => (AppColors.care50, AppColors.care100, AppColors.care700, Icons.check_circle_outline),
      AlertTone.warning => (AppColors.amber50, const Color(0xFFFDE68A), const Color(0xFF78350F), Icons.warning_amber_rounded),
      AlertTone.error => (AppColors.brand50, AppColors.brand200, const Color(0xFF7C1627), Icons.error_outline),
    };
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(16), border: Border.all(color: border)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, color: fg, size: 20),
        const SizedBox(width: 10),
        Expanded(
          child: DefaultTextStyle(
            style: TextStyle(color: fg, fontSize: 13.5, height: 1.4),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (title != null) Text(title!, style: const TextStyle(fontWeight: FontWeight.w700)),
              if (message != null) Padding(padding: EdgeInsets.only(top: title != null ? 2 : 0), child: Text(message!)),
              if (child != null) Padding(padding: const EdgeInsets.only(top: 4), child: child!),
            ]),
          ),
        ),
      ]),
    );
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.title, {super.key, this.eyebrow, this.action, this.onAction});
  final String title;
  final String? eyebrow;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (eyebrow != null)
                Text(eyebrow!.toUpperCase(), style: const TextStyle(color: AppColors.brand600, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.4)),
              Text(title, style: Theme.of(context).textTheme.titleLarge),
            ]),
          ),
          if (action != null) TextButton(onPressed: onAction, child: Text(action!)),
        ]),
      );
}

class CardBox extends StatelessWidget {
  const CardBox({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.onTap, this.color});
  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;
  final Color? color;
  @override
  Widget build(BuildContext context) => Card(
        color: color,
        clipBehavior: Clip.antiAlias,
        child: InkWell(onTap: onTap, child: Padding(padding: padding, child: child)),
      );
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, this.message, this.action});
  final IconData icon;
  final String title;
  final String? message;
  final Widget? action;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(18)),
            child: Icon(icon, color: AppColors.inkSoft, size: 28),
          ),
          const SizedBox(height: 16),
          Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
          if (message != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(message!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.inkMuted))),
          if (action != null) Padding(padding: const EdgeInsets.only(top: 20), child: action!),
        ]),
      );
}

class ErrorRetry extends StatelessWidget {
  const ErrorRetry({super.key, required this.error, required this.onRetry});
  final Object error;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Center(
        child: EmptyState(
          icon: Icons.wifi_off_rounded,
          title: 'Something went wrong',
          message: error is ApiException ? (error as ApiException).message : 'Please check your connection and try again.',
          action: FilledButton(onPressed: onRetry, child: const Text('Try again')),
        ),
      );
}

/// Loads data once and rebuilds on demand; shows a spinner, an error with retry, or the content.
class Loader<T> extends StatefulWidget {
  const Loader({super.key, required this.load, required this.builder});
  final Future<T> Function() load;
  final Widget Function(BuildContext context, T data, Future<void> Function() reload) builder;
  @override
  State<Loader<T>> createState() => _LoaderState<T>();
}

class _LoaderState<T> extends State<Loader<T>> {
  late Future<T> _future = widget.load();
  Future<void> _reload() async {
    final f = widget.load();
    setState(() => _future = f);
    await f.catchError((_) => null as T);
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<T>(
        future: _future,
        builder: (context, snap) {
          if (snap.hasError) return ErrorRetry(error: snap.error!, onRetry: _reload);
          if (!snap.hasData) return const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()));
          return widget.builder(context, snap.data as T, _reload);
        },
      );
}

class QuantityStepper extends StatelessWidget {
  const QuantityStepper({super.key, required this.value, required this.onChanged, this.max = 50, this.small = false});
  final int value;
  final int max;
  final bool small;
  final ValueChanged<int> onChanged;
  @override
  Widget build(BuildContext context) {
    final size = small ? 34.0 : 44.0;
    return Container(
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(99), border: Border.all(color: const Color(0xFFCBD5E1))),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        SizedBox(width: size, height: size, child: IconButton(padding: EdgeInsets.zero, iconSize: 18, onPressed: value > 1 ? () => onChanged(value - 1) : null, icon: const Icon(Icons.remove), tooltip: 'Decrease quantity')),
        SizedBox(width: 28, child: Text('$value', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700))),
        SizedBox(width: size, height: size, child: IconButton(padding: EdgeInsets.zero, iconSize: 18, onPressed: value < max ? () => onChanged(value + 1) : null, icon: const Icon(Icons.add), tooltip: 'Increase quantity')),
      ]),
    );
  }
}

class KeyValue extends StatelessWidget {
  const KeyValue(this.label, this.value, {super.key, this.bold = false});
  final String label, value;
  final bool bold;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          Expanded(child: Text(label, style: TextStyle(color: bold ? AppColors.ink : AppColors.inkMuted, fontWeight: bold ? FontWeight.w700 : FontWeight.w400))),
          Text(value, style: TextStyle(fontWeight: bold ? FontWeight.w800 : FontWeight.w600, fontSize: bold ? 16 : 14)),
        ]),
      );
}

/* ---------------- Small actions ---------------- */

void snack(BuildContext context, String message, {bool error = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Text(message),
      behavior: SnackBarBehavior.floating,
      backgroundColor: error ? AppColors.brand700 : AppColors.ink,
    ));
}

Future<void> openLink(String url) async {
  await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
}

Future<void> copyText(BuildContext context, String value, String label) async {
  await Clipboard.setData(ClipboardData(text: value));
  if (context.mounted) snack(context, '$label copied');
}

Future<bool> confirm(BuildContext context, {required String title, required String message, String ok = 'Confirm', bool danger = false}) async {
  final res = await showDialog<bool>(
    context: context,
    builder: (c) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: [
        TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
        FilledButton(
          style: danger ? FilledButton.styleFrom(backgroundColor: AppColors.brand700) : null,
          onPressed: () => Navigator.pop(c, true),
          child: Text(ok),
        ),
      ],
    ),
  );
  return res == true;
}

/// Runs an API action with a loading guard and shows errors as a snackbar. Returns null on failure.
Future<T?> runAction<T>(BuildContext context, Future<T> Function() action, {String? success}) async {
  try {
    final res = await action();
    if (success != null && context.mounted) snack(context, success);
    return res;
  } on ApiException catch (e) {
    if (context.mounted) snack(context, e.message, error: true);
    return null;
  }
}
