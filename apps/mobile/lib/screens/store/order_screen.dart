import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../state/auth_state.dart';
import '../../state/cart_state.dart';
import '../../widgets/common.dart';
import '../../widgets/files.dart';
import '../../widgets/live_tracking.dart';
import '../../widgets/product_widgets.dart';
import '../../widgets/ui.dart';
import 'paystack_screen.dart';

class OrderScreen extends StatelessWidget {
  const OrderScreen({super.key, required this.number, this.accessKey, this.justPlaced = false});
  final String number;
  final String? accessKey;
  final bool justPlaced;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Track Order')),
    body: Loader(
      load: () async => Order((await api.get('/orders/$number', query: {'key': accessKey}))['order'] as Json),
      builder: (context, order, reload) => RefreshIndicator(
        onRefresh: reload,
        child: OrderDetail(order: order, accessKey: accessKey, justPlaced: justPlaced, reload: reload),
      ),
    ),
  );
}

class OrderDetail extends StatelessWidget {
  const OrderDetail({super.key, required this.order, this.accessKey, this.justPlaced = false, required this.reload});
  final Order order;
  final String? accessKey;
  final bool justPlaced;
  final Future<void> Function() reload;

  // Each step: label, done, and the order-event types that date it.
  List<(String, bool, Set<String>)> _steps() {
    final o = order;
    final st = o.status;
    final s = <(String, bool, Set<String>)>[
      ('Order placed', true, {'PLACED'}),
    ];
    if (o.requiresRx) s.add(('Rx review', st != 'AWAITING_RX_REVIEW' && st != 'CANCELLED' || o.prescription?['status'] == 'APPROVED', {'RX_APPROVED'}));
    if (o.paymentMethod != 'PAY_ON_PICKUP') s.add(('Paid', ['PAID', 'REFUND_PENDING', 'REFUNDED'].contains(o.paymentStatus), {'PAID'}));
    s.add(('Processing', ['PROCESSING', 'READY_FOR_PICKUP', 'DISPATCHED', 'DELIVERED', 'COMPLETED'].contains(st), {'PROCESSING', 'PAID'}));
    if (o.isDelivery) {
      s.add(('Out for delivery', ['DISPATCHED', 'DELIVERED'].contains(st), {'DISPATCHED'}));
      s.add(('Delivered', st == 'DELIVERED', {'DELIVERED'}));
    } else {
      s.add(('Ready', ['READY_FOR_PICKUP', 'COMPLETED'].contains(st), {'READY_FOR_PICKUP'}));
      s.add(('Collected', st == 'COMPLETED', {'COMPLETED'}));
    }
    return s;
  }

  String? _stepDate(Set<String> types) {
    final e = order.events.where((e) => types.contains(e.type)).firstOrNull;
    return e == null ? null : DateFormat('d MMM').format(DateTime.parse(e.createdAt).toUtc().add(const Duration(hours: 1)));
  }

  @override
  Widget build(BuildContext context) {
    final o = order;
    final cancelled = o.status == 'CANCELLED';
    final steps = _steps();
    final current = steps.indexWhere((s) => !s.$2);
    final statusText = orderStatusLabel[o.status] ?? o.status;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
      children: [
        if (justPlaced && !cancelled) ...[
          Panel(
            color: AppColors.care50,
            borderColor: AppColors.care100,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const CircleAvatar(
                  backgroundColor: AppColors.care600,
                  child: Icon(Icons.check, color: Colors.white),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Thank you, ${o.customer['firstName']}! Your order is in.', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                      Text("We've emailed a confirmation to ${o.customer['email']}. This page always shows the latest status.", style: const TextStyle(color: AppColors.inkSoft)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],
        Panel(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text('#${o.number}', maxLines: 1, style: GoogleFonts.plusJakartaSans(fontSize: 19, fontWeight: FontWeight.w800)),
              ),
              const SizedBox(height: 2),
              Text(
                '$statusText · ${fmtDate(o.createdAt)}',
                style: TextStyle(color: cancelled ? AppColors.inkMuted : AppColors.brand600, fontWeight: FontWeight.w600, fontSize: 13),
              ),
              const SizedBox(height: 4),
              Wrap(spacing: 6, children: [PaymentStatusPill(o.paymentStatus)]),
              const SizedBox(height: 16),
              if (!cancelled)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (var i = 0; i < steps.length; i++)
                      Expanded(
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Expanded(child: Container(height: 2, color: i == 0 ? Colors.transparent : (steps[i].$2 ? AppColors.brand600 : AppColors.line))),
                                Container(
                                  width: 26,
                                  height: 26,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: steps[i].$2 ? AppColors.brand600 : Colors.white,
                                    border: Border.all(color: steps[i].$2 || i == current ? AppColors.brand600 : AppColors.line, width: 2),
                                  ),
                                  child: steps[i].$2
                                      ? const Icon(Icons.check_rounded, size: 15, color: Colors.white)
                                      : (i == current ? const Center(child: CircleAvatar(radius: 4, backgroundColor: AppColors.brand600)) : null),
                                ),
                                Expanded(child: Container(height: 2, color: i == steps.length - 1 ? Colors.transparent : (steps[i + 1].$2 ? AppColors.brand600 : AppColors.line))),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              steps[i].$1,
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 10, height: 1.2, fontWeight: FontWeight.w600, color: steps[i].$2 || i == current ? AppColors.ink : AppColors.inkMuted),
                            ),
                            if (steps[i].$2 && _stepDate(steps[i].$3) != null) Text(_stepDate(steps[i].$3)!, style: const TextStyle(fontSize: 9.5, color: AppColors.inkMuted)),
                          ],
                        ),
                      ),
                  ],
                )
              else
                AlertBox(
                  tone: AlertTone.error,
                  title: 'This order was cancelled',
                  message: o.paymentStatus == 'REFUND_PENDING'
                      ? 'Your refund is being processed (2–5 working days).'
                      : o.paymentStatus == 'REFUNDED'
                      ? 'Your refund has been completed.'
                      : 'No payment was taken.',
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _NextStep(order: o, accessKey: accessKey, reload: reload),
        const SizedBox(height: 12),
        Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Items', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              const SizedBox(height: 8),
              for (final i in o.items)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 50,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: ProductArt(name: i.name, icon: i.icon, size: ArtSize.sm),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(i.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                            Text('${i.packSize} · ${i.quantity} × ${naira(i.priceKobo)}', style: const TextStyle(fontSize: 12.5, color: AppColors.inkMuted)),
                            RxBadge(i.rxStatus),
                          ],
                        ),
                      ),
                      Text(naira(i.priceKobo * i.quantity), style: const TextStyle(fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              const Divider(height: 20),
              KeyValue('Subtotal', naira(o.subtotalKobo)),
              KeyValue(o.isDelivery ? 'Delivery' : 'Pickup', o.shippingKobo == 0 ? 'Free' : naira(o.shippingKobo)),
              KeyValue('Total', naira(o.totalKobo), bold: true),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Info(
                o.isDelivery ? 'Delivery' : 'Store pickup',
                o.isDelivery && o.address != null
                    ? '${o.customer['firstName']} ${o.customer['lastName']}\n${o.address!['line1']}${o.address!['line2'] != null ? ', ${o.address!['line2']}' : ''}\n${o.address!['city']}, ${o.address!['state']}${o.address!['landmark'] != null ? '\nLandmark: ${o.address!['landmark']}' : ''}${o.zone != null ? '\n${o.zone!['etaLabel']}' : ''}'
                    : '${Site.addressLine1}, ${Site.addressLine2}, ${Site.city}',
              ),
              _Info('Contact', '${o.customer['email']}\n${fmtPhone(o.customer['phone'] as String?)}'),
              _Info('Payment', '${paymentMethodLabel[o.paymentMethod]}${o.paidAt != null ? '\nPaid ${fmtDateTime(o.paidAt)}' : ''}'),
              if (o.prescription != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    children: [
                      const Expanded(
                        child: Text('Prescription', style: TextStyle(fontWeight: FontWeight.w700)),
                      ),
                      ReviewPill(o.prescription!['status'] as String),
                    ],
                  ),
                ),
              if (o.prescription?['reviewerNote'] != null) Text('“${o.prescription!['reviewerNote']}”', style: const TextStyle(color: AppColors.inkMuted)),
              if (o.notes != null) _Info('Your notes', o.notes!),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Order history', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              const SizedBox(height: 8),
              for (final (i, e) in o.events.reversed.indexed)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: CircleAvatar(radius: 5, backgroundColor: i == 0 ? AppColors.brand600 : const Color(0xFFCBD5E1)),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(e.message, style: const TextStyle(fontWeight: FontWeight.w500)),
                            Text(fmtDateTime(e.createdAt), style: const TextStyle(fontSize: 12, color: AppColors.inkMuted)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        if (o.canCancel)
          OutlinedButton.icon(
            onPressed: () => _cancel(context),
            icon: const Icon(Icons.cancel_outlined, color: AppColors.brand700),
            label: const Text('Cancel order', style: TextStyle(color: AppColors.brand700)),
          ),
        if (['DELIVERED', 'COMPLETED', 'CANCELLED'].contains(o.status))
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: OutlinedButton.icon(
              onPressed: () {
                final cart = context.read<CartState>();
                for (final i in o.items) {
                  if (i.slug == null) continue;
                  cart.add(i.productId, {'slug': i.slug, 'name': i.name, 'packSize': i.packSize, 'priceKobo': i.priceKobo, 'rxStatus': i.rxStatus, 'icon': i.icon}, i.quantity);
                }
                context.go('/cart');
              },
              icon: const Icon(Icons.replay),
              label: const Text('Buy again'),
            ),
          ),
        TextButton.icon(onPressed: () => context.push('/support'), icon: const Icon(Icons.support_agent_rounded), label: const Text('Questions? Chat with a pharmacist')),
        const SizedBox(height: 24),
      ],
    );
  }

  Future<void> _cancel(BuildContext context) async {
    final reasons = ['I ordered the wrong item', 'I found it cheaper elsewhere', 'Delivery takes too long', 'I no longer need it', 'Other'];
    String? reason;
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => StatefulBuilder(
        builder: (c, set) => AlertDialog(
          title: const Text('Cancel this order?'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(order.paymentStatus == 'PAID' ? "You'll get a full refund to your original payment method within 2–5 working days." : 'No payment has been taken, so there\'s nothing to refund.'),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: reason,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Reason (optional)'),
                items: [for (final r in reasons) DropdownMenuItem(value: r, child: Text(r))],
                onChanged: (v) => set(() => reason = v),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Keep order')),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: AppColors.brand700),
              onPressed: () => Navigator.pop(c, true),
              child: const Text('Yes, cancel'),
            ),
          ],
        ),
      ),
    );
    if (ok != true || !context.mounted) return;
    final res = await runAction(
      context,
      () => api.post('/orders/${order.number}/cancel${accessKey != null ? '?key=$accessKey' : ''}', {if (reason != null) 'reason': reason}),
      success: 'Order cancelled',
    );
    if (res != null) await reload();
  }
}

class _Info extends StatelessWidget {
  const _Info(this.title, this.body);
  final String title, body;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 2),
        Text(body, style: const TextStyle(color: AppColors.inkSoft, height: 1.45)),
      ],
    ),
  );
}

class _NextStep extends StatefulWidget {
  const _NextStep({required this.order, this.accessKey, required this.reload});
  final Order order;
  final String? accessKey;
  final Future<void> Function() reload;
  @override
  State<_NextStep> createState() => _NextStepState();
}

class _NextStepState extends State<_NextStep> {
  PickedFile? _receipt;
  bool _busy = false;

  String get _q => widget.accessKey != null ? '?key=${widget.accessKey}' : '';

  Future<void> _payOnline() async {
    setState(() => _busy = true);
    final res = await runAction(context, () => api.post('/orders/${widget.order.number}/pay$_q'));
    setState(() => _busy = false);
    if (res == null || !mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PaystackScreen(url: res['paymentUrl'] as String, number: widget.order.number, accessKey: widget.order.accessKey),
      ),
    );
    await widget.reload();
  }

  Future<void> _sendReceipt() async {
    if (_receipt == null) return;
    setState(() => _busy = true);
    final res = await runAction(context, () => api.upload('/orders/${widget.order.number}/payment-proof$_q', files: {'file': _receipt!.path}), success: 'Receipt sent');
    setState(() => _busy = false);
    if (res != null) await widget.reload();
  }

  @override
  Widget build(BuildContext context) {
    final o = widget.order;
    Widget panel(IconData icon, Color bg, Color fg, String title, String body, [Widget? extra]) => Panel(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: fg),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                const SizedBox(height: 2),
                Text(body, style: const TextStyle(color: AppColors.inkSoft, height: 1.45)),
                if (extra != null) Padding(padding: const EdgeInsets.only(top: 12), child: extra),
              ],
            ),
          ),
        ],
      ),
    );

    switch (o.status) {
      case 'AWAITING_RX_REVIEW':
        return panel(
          Icons.schedule,
          AppColors.amber100,
          AppColors.amber800,
          'Your prescription is being reviewed',
          "A registered pharmacist is checking it, usually within 2 working hours during opening times. We'll email you as soon as it's approved, and then you can pay. Nothing has been charged yet.",
        );
      case 'AWAITING_PAYMENT':
        if (o.paymentStatus == 'PROOF_SUBMITTED') {
          return panel(
            Icons.schedule,
            AppColors.amber100,
            AppColors.amber800,
            "We're confirming your transfer",
            "Thanks for sending your receipt. We usually confirm transfers within 1 working hour.",
          );
        }
        if (o.paymentMethod == 'BANK_TRANSFER' && o.bankDetails != null) {
          final b = o.bankDetails!;
          return Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.account_balance_outlined, color: AppColors.orange800),
                    SizedBox(width: 8),
                    Text('Complete your bank transfer', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'Transfer the exact amount and use your order number as the narration.${o.payBy != null ? ' Please pay by ${fmtDateTime(o.payBy)}, or the order will be released.' : ''}',
                  style: const TextStyle(color: AppColors.inkSoft),
                ),
                const SizedBox(height: 12),
                for (final (label, value, copy) in [
                  ('Amount', naira(o.totalKobo), '${o.totalKobo ~/ 100}'),
                  ('Bank', b['name'] as String, null),
                  ('Account name', b['accountName'] as String, null),
                  ('Account number', b['accountNumber'] as String, b['accountNumber'] as String),
                  ('Reference', o.number, o.number),
                ])
                  Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(12)),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(label, style: const TextStyle(fontSize: 12, color: AppColors.inkMuted)),
                              Text(value, style: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 0.4)),
                            ],
                          ),
                        ),
                        if (copy != null) TextButton.icon(onPressed: () => copyText(context, copy, label), icon: const Icon(Icons.copy, size: 16), label: const Text('Copy')),
                      ],
                    ),
                  ),
                const SizedBox(height: 4),
                FilePickField(label: 'Upload your transfer receipt', file: _receipt, onChanged: (f) => setState(() => _receipt = f), hint: 'A screenshot from your banking app is fine.'),
                const SizedBox(height: 10),
                FilledButton.icon(
                  style: FilledButton.styleFrom(backgroundColor: AppColors.ink),
                  onPressed: _receipt == null || _busy ? null : _sendReceipt,
                  icon: const Icon(Icons.upload),
                  label: const Text('Send receipt'),
                ),
                if (o.canPayOnline) ...[
                  const SizedBox(height: 8),
                  OutlinedButton.icon(onPressed: _busy ? null : _payOnline, icon: const Icon(Icons.credit_card), label: const Text('Pay by card or USSD instead')),
                ],
              ],
            ),
          );
        }
        return panel(
          Icons.schedule,
          AppColors.amber100,
          AppColors.amber800,
          o.requiresRx ? 'Prescription approved. Ready for payment' : 'Payment needed',
          'Complete payment so we can start preparing your order.',
          o.canPayOnline
              ? FilledButton.icon(onPressed: _busy ? null : _payOnline, icon: const Icon(Icons.credit_card), label: const Text('Pay now with card, bank or USSD'))
              : const Text('Card payment is unavailable right now. Please contact us.'),
        );
      case 'PROCESSING':
        return panel(
          Icons.inventory_2_outlined,
          AppColors.sky100,
          AppColors.sky800,
          "We're preparing your order",
          'Our pharmacists are picking and checking your items. ${o.isDelivery ? "It'll be on its way soon${o.zone != null ? '. Expected: ${(o.zone!['etaLabel'] as String).toLowerCase()}' : ''}." : "We'll message you when it's ready to collect."}',
        );
      case 'READY_FOR_PICKUP':
        return panel(
          Icons.storefront_outlined,
          AppColors.indigo100,
          AppColors.indigo800,
          'Ready to collect',
          'Your order is waiting at ${Site.addressLine1}, ${Site.addressLine2}. Bring your order number ${o.number}${o.paymentMethod == 'PAY_ON_PICKUP' ? ' and ${naira(o.totalKobo)}.' : '.'}',
        );
      case 'DISPATCHED':
        if (o.live) return LiveTracking(number: o.number, accessKey: widget.accessKey, code: o.deliveryCode, onStatusChange: widget.reload);
        return panel(
          Icons.local_shipping_outlined,
          AppColors.indigo100,
          AppColors.indigo800,
          'Your order is on its way',
          'Our rider will call ${fmtPhone(o.customer['phone'] as String?)} on arrival.',
        );
      case 'DELIVERED':
      case 'COMPLETED':
        return panel(
          Icons.check_circle_outline,
          AppColors.care100,
          AppColors.care700,
          'All done. Thank you!',
          'If anything is wrong with your order, let us know within 48 hours.',
          TextButton(
            style: TextButton.styleFrom(padding: EdgeInsets.zero),
            onPressed: () => context.push('/info/returns'),
            child: const Text('Returns policy'),
          ),
        );
      case 'CANCELLED':
        return panel(Icons.cancel_outlined, AppColors.slate100, AppColors.inkSoft, 'Need it after all?', 'Reorder the same items in one tap with “Buy again”.');
    }
    return const SizedBox.shrink();
  }
}

/// Guest order lookup by order number + email.
class TrackOrderScreen extends StatefulWidget {
  const TrackOrderScreen({super.key});
  @override
  State<TrackOrderScreen> createState() => _TrackOrderScreenState();
}

class _TrackOrderScreenState extends State<TrackOrderScreen> {
  final _number = TextEditingController(), _email = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    return Scaffold(
      appBar: AppBar(title: const Text('Track your order')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Enter your order number (it starts with MGK-) and the email you used at checkout.', style: TextStyle(color: AppColors.inkMuted)),
          const SizedBox(height: 16),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: AlertBox(tone: AlertTone.error, message: _error),
            ),
          TextField(
            controller: _number,
            textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(labelText: 'Order number', hintText: 'MGK-261015-123456'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(labelText: 'Email address', hintText: user?.email),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy
                ? null
                : () async {
                    setState(() {
                      _busy = true;
                      _error = null;
                    });
                    try {
                      final r = await api.post('/orders/track', {'number': _number.text.trim(), 'email': _email.text.trim()});
                      if (context.mounted) context.push('/order/${r['number']}?key=${r['accessKey']}');
                    } on ApiException catch (e) {
                      setState(() => _error = e.message);
                    } finally {
                      if (mounted) setState(() => _busy = false);
                    }
                  },
            child: const Text('Find my order'),
          ),
        ],
      ),
    );
  }
}
