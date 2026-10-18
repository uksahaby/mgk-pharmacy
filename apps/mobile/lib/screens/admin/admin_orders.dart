import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../state/auth_state.dart';
import '../../widgets/common.dart';
import '../../widgets/live_tracking.dart';
import 'admin_home.dart';

const _statuses = ['', 'AWAITING_RX_REVIEW', 'AWAITING_PAYMENT', 'PROCESSING', 'READY_FOR_PICKUP', 'DISPATCHED', 'DELIVERED', 'COMPLETED', 'CANCELLED'];

class AdminOrdersScreen extends StatefulWidget {
  const AdminOrdersScreen({super.key, this.status, this.queue});
  final String? status, queue;
  @override
  State<AdminOrdersScreen> createState() => _AdminOrdersScreenState();
}

class _AdminOrdersScreenState extends State<AdminOrdersScreen> {
  late String _status = widget.status ?? '';
  late String? _queue = widget.queue;
  final _q = TextEditingController();
  int _page = 1;
  Key _key = UniqueKey();

  void _apply() => setState(() {
        _page = 1;
        _key = UniqueKey();
      });

  @override
  Widget build(BuildContext context) => AdminScaffold(
        title: 'Orders',
        permission: 'orders.view',
        body: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: TextField(controller: _q, textInputAction: TextInputAction.search, onSubmitted: (_) => _apply(), decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Order no., email, name or phone')),
          ),
          SizedBox(
            height: 48,
            child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6), children: [
              for (final s in _statuses)
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ChoiceChip(
                    label: Text(s.isEmpty ? 'All' : orderStatusLabel[s]!),
                    selected: _status == s && _queue == null,
                    onSelected: (_) {
                      _status = s;
                      _queue = null;
                      _apply();
                    },
                  ),
                ),
              ChoiceChip(label: const Text('Receipts to confirm'), selected: _queue == 'proof', onSelected: (_) {
                _queue = 'proof';
                _apply();
              }),
            ]),
          ),
          Expanded(
            child: Loader(
              key: _key,
              load: () => api.get('/admin/orders', query: {'status': _queue == null ? _status : null, 'queue': _queue, 'q': _q.text.trim(), 'page': _page}),
              builder: (context, data, reload) {
                final orders = (data['orders'] as List).map((o) => Order(o as Json)).toList();
                final pageCount = (data['pageCount'] as num).toInt();
                if (orders.isEmpty) return const Center(child: EmptyState(icon: Icons.inventory_2_outlined, title: 'No orders found'));
                return RefreshIndicator(
                  onRefresh: reload,
                  child: ListView(padding: const EdgeInsets.all(16), children: [
                    Text('${data['total']} orders', style: const TextStyle(color: AppColors.inkMuted)),
                    const SizedBox(height: 8),
                    for (final o in orders) Padding(padding: const EdgeInsets.only(bottom: 8), child: AdminOrderTile(o)),
                    if (pageCount > 1)
                      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                        IconButton(onPressed: _page > 1 ? () => setState(() { _page--; _key = UniqueKey(); }) : null, icon: const Icon(Icons.chevron_left)),
                        Text('Page $_page of $pageCount'),
                        IconButton(onPressed: _page < pageCount ? () => setState(() { _page++; _key = UniqueKey(); }) : null, icon: const Icon(Icons.chevron_right)),
                      ]),
                  ]),
                );
              },
            ),
          ),
        ]),
      );
}

class AdminOrderScreen extends StatefulWidget {
  const AdminOrderScreen({super.key, required this.number});
  final String number;
  @override
  State<AdminOrderScreen> createState() => _AdminOrderScreenState();
}

class _AdminOrderScreenState extends State<AdminOrderScreen> {
  Key _key = UniqueKey();
  void _refresh() => setState(() => _key = UniqueKey());

  @override
  Widget build(BuildContext context) => AdminScaffold(
        title: widget.number,
        permission: 'orders.view',
        body: Loader(
          key: _key,
          load: () => api.get('/admin/orders/${widget.number}'),
          builder: (context, data, reload) {
            final o = Order(data['order'] as Json);
            final allowed = (data['allowedTransitions'] as List).cast<String>();
            return RefreshIndicator(
              onRefresh: reload,
              child: ListView(padding: const EdgeInsets.all(16), children: [
                Wrap(spacing: 6, children: [OrderStatusPill(o.status), PaymentStatusPill(o.paymentStatus)]),
                Text('Placed ${fmtDateTime(o.createdAt)}', style: const TextStyle(color: AppColors.inkMuted)),
                const SizedBox(height: 12),
                if (context.watch<AuthState>().user?.can('orders.manage') == true) _Actions(order: o, allowed: allowed, onDone: _refresh),
                if (o.status == 'DISPATCHED' && o.live) ...[
                  const SizedBox(height: 12),
                  LiveTracking(number: o.number, code: o.deliveryCode, staff: true, onStatusChange: _refresh),
                ],
                const SizedBox(height: 12),
                CardBox(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Items', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                    for (final i in o.items)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(children: [
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(i.name, style: const TextStyle(fontWeight: FontWeight.w600)), Text('${i.packSize} · ${i.quantity} × ${naira(i.priceKobo)}', style: const TextStyle(fontSize: 12.5, color: AppColors.inkMuted)), RxBadge(i.rxStatus)])),
                          Text(naira(i.priceKobo * i.quantity), style: const TextStyle(fontWeight: FontWeight.w700)),
                        ]),
                      ),
                    const Divider(height: 18),
                    KeyValue('Subtotal', naira(o.subtotalKobo)),
                    KeyValue(o.isDelivery ? 'Delivery (${o.zone?['name'] ?? '—'})' : 'Pickup', naira(o.shippingKobo)),
                    KeyValue('Total', naira(o.totalKobo), bold: true),
                  ]),
                ),
                const SizedBox(height: 12),
                CardBox(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Customer', style: TextStyle(fontWeight: FontWeight.w800)),
                    Text('${o.customer['firstName']} ${o.customer['lastName']}\n${o.customer['email']}\n${fmtPhone(o.customer['phone'] as String?)}', style: const TextStyle(height: 1.5)),
                    Row(children: [
                      TextButton.icon(onPressed: () => openLink('tel:${o.customer['phone']}'), icon: const Icon(Icons.call_outlined, size: 16), label: const Text('Call')),
                      TextButton.icon(onPressed: () => openLink('mailto:${o.customer['email']}'), icon: const Icon(Icons.mail_outline, size: 16), label: const Text('Email')),
                    ]),
                    const Divider(height: 18),
                    Text(o.isDelivery ? 'Deliver to' : 'Store pickup', style: const TextStyle(fontWeight: FontWeight.w800)),
                    if (o.address != null) Text('${o.address!['line1']}${o.address!['line2'] != null ? ', ${o.address!['line2']}' : ''}\n${o.address!['city']}, ${o.address!['state']}${o.address!['landmark'] != null ? '\nLandmark: ${o.address!['landmark']}' : ''}', style: const TextStyle(height: 1.5)),
                    const Divider(height: 18),
                    const Text('Payment', style: TextStyle(fontWeight: FontWeight.w800)),
                    Text('${paymentMethodLabel[o.paymentMethod]}${o.paymentRef != null ? ' · ref ${o.paymentRef}' : ''}'),
                    if (o.hasProof)
                      TextButton.icon(
                        style: TextButton.styleFrom(padding: EdgeInsets.zero),
                        onPressed: () => context.push('/file?path=${Uri.encodeComponent('/admin/orders/${o.number}/payment-proof')}&title=Transfer receipt'),
                        icon: const Icon(Icons.receipt_long_outlined, size: 16),
                        label: const Text('View transfer receipt'),
                      ),
                    if (o.prescription != null) ...[
                      const Divider(height: 18),
                      Row(children: [const Expanded(child: Text('Prescription', style: TextStyle(fontWeight: FontWeight.w800))), ReviewPill(o.prescription!['status'] as String)]),
                      TextButton.icon(
                        style: TextButton.styleFrom(padding: EdgeInsets.zero),
                        onPressed: () => context.push('/file?path=${Uri.encodeComponent('/admin/prescriptions/${o.prescription!['id']}/file')}&title=Prescription'),
                        icon: const Icon(Icons.open_in_new, size: 16),
                        label: const Text('Open file'),
                      ),
                    ],
                    if (o.notes != null) ...[const Divider(height: 18), const Text('Customer notes', style: TextStyle(fontWeight: FontWeight.w800)), Text(o.notes!)],
                  ]),
                ),
                const SizedBox(height: 12),
                CardBox(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Timeline', style: TextStyle(fontWeight: FontWeight.w800)),
                    for (final e in o.events.reversed)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 5),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(e.message), Text('${fmtDateTime(e.createdAt)} · ${e.actor ?? ''}', style: const TextStyle(fontSize: 12, color: AppColors.inkMuted))]),
                      ),
                  ]),
                ),
              ]),
            );
          },
        ),
      );
}

class _Actions extends StatefulWidget {
  const _Actions({required this.order, required this.allowed, required this.onDone});
  final Order order;
  final List<String> allowed;
  final VoidCallback onDone;
  @override
  State<_Actions> createState() => _ActionsState();
}

class _ActionsState extends State<_Actions> {
  final _note = TextEditingController(), _reference = TextEditingController();
  List<Json> _riders = [];
  String? _riderId;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    if (widget.allowed.contains('DISPATCHED')) {
      api.get('/admin/riders').then((r) => mounted ? setState(() => _riders = (r['riders'] as List).cast<Json>()) : null).catchError((_) => null);
    }
  }

  Future<void> _run(Future<Json> Function() fn, String ok) async {
    setState(() => _busy = true);
    final res = await runAction(context, fn, success: ok);
    if (mounted) setState(() => _busy = false);
    if (res != null) widget.onDone();
  }

  @override
  Widget build(BuildContext context) {
    final o = widget.order;
    final canMarkPaid = o.status == 'AWAITING_PAYMENT' && o.paymentStatus != 'PAID';
    final forward = widget.allowed.where((s) => s != 'CANCELLED' && !(o.status == 'AWAITING_PAYMENT' && s == 'PROCESSING')).toList();
    return CardBox(
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Text('Actions', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        const SizedBox(height: 10),
        if (canMarkPaid) ...[
          AlertBox(tone: AlertTone.warning, message: o.paymentStatus == 'PROOF_SUBMITTED' ? 'Customer uploaded a transfer receipt. Check it against the bank statement.' : 'Waiting for payment.'),
          const SizedBox(height: 8),
          TextField(controller: _reference, decoration: const InputDecoration(labelText: 'Bank reference (optional)')),
          const SizedBox(height: 8),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.care600),
            onPressed: _busy ? null : () => _run(() => api.post('/admin/orders/${o.number}/mark-paid', {if (_reference.text.trim().isNotEmpty) 'reference': _reference.text.trim()}), 'Payment confirmed'),
            child: const Text('Confirm payment received'),
          ),
          const SizedBox(height: 12),
        ],
        if (o.paymentStatus == 'REFUND_PENDING')
          FilledButton(style: FilledButton.styleFrom(backgroundColor: AppColors.ink), onPressed: _busy ? null : () => _run(() => api.post('/admin/orders/${o.number}/refunded'), 'Refund marked complete'), child: const Text('Mark refund as completed')),
        if (forward.isNotEmpty) ...[
          if (forward.contains('DISPATCHED')) ...[
            DropdownButtonFormField<String>(
              initialValue: _riderId,
              decoration: const InputDecoration(labelText: 'Rider'),
              items: [
                for (final r in _riders)
                  DropdownMenuItem(value: r['id'] as String, child: Text('${r['name']}${(r['activeDeliveries'] as num) > 0 ? ' (${r['activeDeliveries']} on the road)' : ' (available)'}')),
              ],
              onChanged: (v) => setState(() => _riderId = v),
            ),
            if (_riders.isEmpty) const Padding(padding: EdgeInsets.only(top: 4), child: Text('No rider accounts yet. Create one in Staff & roles.', style: TextStyle(fontSize: 12, color: AppColors.inkMuted))),
            const SizedBox(height: 8),
          ],
          TextField(controller: _note, decoration: const InputDecoration(labelText: 'Note to customer (optional)')),
          const SizedBox(height: 8),
          for (final s in forward)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: FilledButton(
                onPressed: _busy || (s == 'DISPATCHED' && _riderId == null)
                    ? null
                    : () => _run(() => api.post('/admin/orders/${o.number}/status', {'status': s, if (_note.text.trim().isNotEmpty) 'note': _note.text.trim(), if (s == 'DISPATCHED') 'riderId': _riderId}),
                        s == 'DISPATCHED' ? 'Sent out for delivery' : 'Moved to ${orderStatusLabel[s]}'),
                child: Text(s == 'DISPATCHED' ? 'Send out for delivery' : 'Move to “${orderStatusLabel[s]}”'),
              ),
            ),
        ],
        if (widget.allowed.contains('CANCELLED'))
          OutlinedButton(
            onPressed: _busy
                ? null
                : () async {
                    final reason = TextEditingController();
                    final ok = await showDialog<bool>(
                      context: context,
                      builder: (c) => AlertDialog(
                        title: const Text('Cancel order'),
                        content: TextField(controller: reason, decoration: const InputDecoration(labelText: 'Reason (sent to the customer)')),
                        actions: [TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Back')), FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Cancel order'))],
                      ),
                    );
                    if (ok == true && reason.text.trim().isNotEmpty) await _run(() => api.post('/admin/orders/${o.number}/status', {'status': 'CANCELLED', 'note': reason.text.trim()}), 'Order cancelled');
                  },
            child: const Text('Cancel order', style: TextStyle(color: AppColors.brand700)),
          ),
        if (!canMarkPaid && forward.isEmpty && !widget.allowed.contains('CANCELLED') && o.paymentStatus != 'REFUND_PENDING') const Text('No further actions for this order.', style: TextStyle(color: AppColors.inkMuted)),
        if (o.status == 'AWAITING_RX_REVIEW') const Text('Approve or reject the prescription to move this order forward.', style: TextStyle(fontSize: 12, color: AppColors.inkMuted)),
      ]),
    );
  }
}
