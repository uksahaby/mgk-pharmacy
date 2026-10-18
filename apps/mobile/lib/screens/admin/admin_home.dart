import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../state/auth_state.dart';
import '../../widgets/common.dart';

const _adminLinks = [
  ('/admin', 'Overview', Icons.speed_outlined, 'dashboard.view'),
  ('/admin/orders', 'Orders', Icons.inventory_2_outlined, 'orders.view'),
  ('/admin/prescriptions', 'Prescriptions', Icons.description_outlined, 'prescriptions.review'),
  ('/admin/verifications', 'Verifications', Icons.verified_user_outlined, 'verifications.review'),
  ('/admin/products', 'Products', Icons.medication_outlined, 'products.manage'),
  ('/admin/inventory', 'Inventory', Icons.warehouse_outlined, 'inventory.manage'),
  ('/admin/customers', 'Customers', Icons.people_outline, 'customers.view'),
  ('/admin/messages', 'Messages', Icons.inbox_outlined, 'messages.view'),
  ('/admin/staff', 'Staff & roles', Icons.admin_panel_settings_outlined, 'staff.manage'),
];

/// Staff layout: dark drawer with only the sections this role may open (the API enforces the same rules).
class AdminScaffold extends StatelessWidget {
  const AdminScaffold({super.key, required this.title, required this.body, this.permission, this.actions, this.fab});
  final String title;
  final Widget body;
  final String? permission;
  final List<Widget>? actions;
  final Widget? fab;

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    final allowed = permission == null || (user?.can(permission!) ?? false);
    final current = GoRouterState.of(context).matchedLocation;
    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(title: Text(title), actions: actions),
      floatingActionButton: allowed ? fab : null,
      drawer: Drawer(
        backgroundColor: AppColors.ink,
        child: SafeArea(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(children: [
                Container(width: 38, height: 38, decoration: BoxDecoration(color: AppColors.brand600, borderRadius: BorderRadius.circular(11)), child: const Icon(Icons.add, color: Colors.white)),
                const SizedBox(width: 10),
                const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('MGK', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18)),
                  Text('PHARMACY ADMIN', style: TextStyle(color: Colors.white38, fontSize: 9.5, letterSpacing: 2, fontWeight: FontWeight.w700)),
                ]),
              ]),
            ),
            Expanded(
              child: ListView(children: [
                for (final (path, label, icon, perm) in _adminLinks)
                  if (user?.can(perm) == true)
                    ListTile(
                      selected: path == '/admin' ? current == path : current.startsWith(path),
                      selectedTileColor: Colors.white10,
                      iconColor: Colors.white60,
                      textColor: Colors.white70,
                      selectedColor: Colors.white,
                      leading: Icon(icon),
                      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
                      onTap: () {
                        Navigator.pop(context);
                        context.go(path);
                      },
                    ),
              ]),
            ),
            const Divider(color: Colors.white12),
            ListTile(
              title: Text(user?.fullName ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
              subtitle: Text(roleLabel[user?.role] ?? '', style: const TextStyle(color: Colors.white38)),
            ),
            ListTile(iconColor: Colors.white60, textColor: Colors.white70, leading: const Icon(Icons.storefront_outlined), title: const Text('View store'), onTap: () => context.go('/home')),
            ListTile(iconColor: Colors.white60, textColor: Colors.white70, leading: const Icon(Icons.logout), title: const Text('Sign out'), onTap: () => context.read<AuthState>().logout()),
          ]),
        ),
      ),
      body: allowed
          ? body
          : const Center(child: EmptyState(icon: Icons.lock_outline, title: "That section isn't available for your role", message: 'Ask an administrator if you need access.')),
    );
  }
}

class AdminHomeScreen extends StatelessWidget {
  const AdminHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    // Signed out (e.g. from the drawer): the router is about to leave this screen.
    if (user == null) return const Scaffold(body: SizedBox.shrink());
    return AdminScaffold(
      title: 'Overview',
      permission: 'dashboard.view',
      body: Loader(
        load: () => api.get('/admin/summary'),
        builder: (context, s, reload) {
          final q = s['queues'] as Json;
          final queues = [
            ('/admin/prescriptions', 'Prescriptions to review', 'rxPending', Icons.description_outlined, true),
            ('/admin/orders?queue=proof', 'Transfer receipts to confirm', 'proofPending', Icons.receipt_long_outlined, true),
            ('/admin/verifications', 'ID verifications', 'verifPending', Icons.verified_user_outlined, true),
            ('/admin/inventory', 'Running low (10 or fewer)', 'lowStock', Icons.warehouse_outlined, true),
            ('/admin/products?stock=never', 'Listed but never stocked', 'neverStocked', Icons.inventory_outlined, false),
            ('/admin/inventory', 'Batches expiring ≤ 90 days', 'expiringBatches', Icons.event_outlined, false),
            ('/admin/messages', 'Unread messages', 'messages', Icons.inbox_outlined, true),
          ].where((x) => q[x.$3] != null).toList();
          final today = s['today'] as Json?, last30 = s['last30'] as Json?;
          final byStatus = (s['ordersByStatus'] as Json?) ?? {};
          final recent = (s['recentOrders'] as List).map((o) => Order(o as Json)).toList();
          return RefreshIndicator(
            onRefresh: reload,
            child: ListView(padding: const EdgeInsets.all(16), children: [
              Text('Welcome, ${user.firstName}. Signed in as ${(roleLabel[user.role] ?? '').toLowerCase()}.', style: const TextStyle(color: AppColors.inkMuted)),
              const SizedBox(height: 12),
              if (today != null && last30 != null)
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  childAspectRatio: 1.55,
                  children: [
                    _Kpi('Revenue today', naira(today['revenueKobo'] as num), plural((today['orders'] as num).toInt(), 'paid order')),
                    _Kpi('Last 30 days', naira(last30['revenueKobo'] as num), plural((last30['orders'] as num).toInt(), 'paid order')),
                    _Kpi('Being prepared', '${byStatus['PROCESSING'] ?? 0}', 'Paid, ready to pack'),
                    _Kpi('Awaiting payment', '${byStatus['AWAITING_PAYMENT'] ?? 0}', 'Auto-cancel after 48h'),
                  ],
                ),
              const SizedBox(height: 16),
              const Text('WORK QUEUES', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1, color: AppColors.inkMuted)),
              const SizedBox(height: 8),
              for (final (path, label, key, icon, alert) in queues)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: CardBox(
                    padding: const EdgeInsets.all(12),
                    onTap: () => context.push(path),
                    child: Row(children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(color: alert && (q[key] as num) > 0 ? AppColors.brand50 : AppColors.slate100, borderRadius: BorderRadius.circular(11)),
                        child: Icon(icon, color: alert && (q[key] as num) > 0 ? AppColors.brand600 : AppColors.inkSoft),
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600))),
                      Text('${q[key]}', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: alert && (q[key] as num) > 0 ? AppColors.brand600 : AppColors.ink)),
                    ]),
                  ),
                ),
              if (user.can('orders.view')) ...[
                const SizedBox(height: 12),
                SectionTitle('Latest orders', action: 'All orders', onAction: () => context.push('/admin/orders')),
                for (final o in recent) Padding(padding: const EdgeInsets.only(bottom: 8), child: AdminOrderTile(o)),
              ],
            ]),
          );
        },
      ),
    );
  }
}

class _Kpi extends StatelessWidget {
  const _Kpi(this.label, this.value, this.sub);
  final String label, value, sub;
  @override
  Widget build(BuildContext context) => CardBox(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(label, style: const TextStyle(color: AppColors.inkMuted, fontSize: 12.5)),
          const SizedBox(height: 4),
          FittedBox(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 22))),
          Text(sub, style: const TextStyle(color: AppColors.inkMuted, fontSize: 11.5)),
        ]),
      );
}

class AdminOrderTile extends StatelessWidget {
  const AdminOrderTile(this.o, {super.key});
  final Order o;
  @override
  Widget build(BuildContext context) => CardBox(
        padding: const EdgeInsets.all(12),
        onTap: () => context.push('/admin/orders/${o.number}'),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(o.number, style: const TextStyle(fontWeight: FontWeight.w800))),
            Text(naira(o.totalKobo), style: const TextStyle(fontWeight: FontWeight.w800)),
          ]),
          Text('${o.customer['firstName']} ${o.customer['lastName']} · ${fmtDateTime(o.createdAt)}', style: const TextStyle(fontSize: 12.5, color: AppColors.inkMuted)),
          const SizedBox(height: 6),
          Wrap(spacing: 6, runSpacing: 4, children: [
            OrderStatusPill(o.status),
            PaymentStatusPill(o.paymentStatus),
            if (o.requiresRx) const Pill('Rx', bg: AppColors.amber100, fg: AppColors.amber800),
            Pill(o.isDelivery ? '${o.address?['city'] ?? ''}, ${o.address?['state'] ?? ''}' : 'Pickup', bg: AppColors.slate100, fg: AppColors.inkSoft),
          ]),
        ]),
      );
}
