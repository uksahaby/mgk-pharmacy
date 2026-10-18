import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../state/auth_state.dart';
import '../../widgets/common.dart';
import '../../widgets/files.dart';
import '../../widgets/product_widgets.dart';
import '../../widgets/ui.dart';

/* ======================= Account tab ======================= */

class AccountHomeScreen extends StatelessWidget {
  const AccountHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    return Scaffold(
      appBar: AppBar(title: const Text('My Account'), automaticallyImplyLeading: false),
      body: user == null ? const _SignedOut() : _SignedIn(user: user),
    );
  }
}

class _SignedOut extends StatelessWidget {
  const _SignedOut();
  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
    children: [
      Panel(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Align(alignment: Alignment.centerLeft, child: IconBadge(Icons.person_outline_rounded, size: 56)),
            const SizedBox(height: 14),
            Text('Your pharmacy, in your pocket', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, fontSize: 18)),
            const SizedBox(height: 6),
            const Text('Sign in to track orders, save prescriptions for repeat orders and check out faster.', style: TextStyle(color: AppColors.inkMuted, height: 1.4)),
            const SizedBox(height: 16),
            FilledButton(onPressed: () => context.push('/login'), child: const Text('Sign in')),
            const SizedBox(height: 8),
            OutlinedButton(onPressed: () => context.push('/register'), child: const Text('Create an account')),
          ],
        ),
      ),
      const SizedBox(height: 18),
      const _HelpLinks(),
    ],
  );
}

class _SignedIn extends StatelessWidget {
  const _SignedIn({required this.user});
  final User user;

  @override
  Widget build(BuildContext context) {
    const verification = {'UNVERIFIED': 'Not verified yet', 'PENDING': 'In review', 'APPROVED': 'Verified', 'REJECTED': 'Action needed'};
    return Loader(
      load: () => api.get('/account/overview'),
      builder: (context, data, reload) {
        final recent = (data['recentOrders'] as List).cast<Json>();
        final needsPayment = recent.where((o) => o['status'] == 'AWAITING_PAYMENT' && o['paymentStatus'] == 'UNPAID').firstOrNull;
        final rxCount = (data['prescriptions'] as List).length;
        return RefreshIndicator(
          onRefresh: reload,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: AppColors.brand600,
                    child: Text(
                      user.initials,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 20),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(user.fullName, style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w800)),
                        Text(user.email, style: const TextStyle(color: AppColors.inkMuted, fontSize: 13)),
                        if (user.role != 'CUSTOMER') Padding(padding: const EdgeInsets.only(top: 4), child: RolePill(user.role)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              if (user.isStaff || user.isRider) ...[
                Panel(
                  color: AppColors.ink,
                  borderColor: AppColors.ink,
                  onTap: () => context.push(user.isStaff ? '/admin' : '/rider'),
                  child: Row(
                    children: [
                      Icon(user.isStaff ? Icons.dashboard_outlined : Icons.delivery_dining_rounded, color: Colors.white),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          user.isStaff ? 'Open pharmacy dashboard' : 'My deliveries',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                        ),
                      ),
                      const Icon(Icons.arrow_forward_rounded, color: Colors.white70),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],
              if (needsPayment != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: AlertBox(
                    tone: AlertTone.warning,
                    title: 'Order ${needsPayment['number']} is waiting for payment',
                    child: TextButton(
                      style: TextButton.styleFrom(padding: EdgeInsets.zero),
                      onPressed: () => context.push('/order/${needsPayment['number']}'),
                      child: const Text('Complete payment'),
                    ),
                  ),
                ),
              MenuRow(
                icon: Icons.place_outlined,
                title: 'My Addresses',
                subtitle: '${plural((data['addressCount'] as num).toInt(), 'saved address', 'saved addresses')}',
                onTap: () => context.push('/account/addresses'),
              ),
              const SizedBox(height: 10),
              MenuRow(
                icon: Icons.description_outlined,
                title: 'My Prescriptions',
                subtitle: rxCount == 0 ? 'Upload and manage prescriptions' : plural(rxCount, 'prescription'),
                onTap: () => context.go('/prescriptions'),
              ),
              const SizedBox(height: 10),
              MenuRow(
                icon: Icons.history_rounded,
                title: 'Order History',
                subtitle: (data['activeOrders'] as num) > 0 ? '${data['activeOrders']} in progress' : 'Track your past orders',
                onTap: () => context.go('/orders'),
              ),
              const SizedBox(height: 10),
              MenuRow(icon: Icons.verified_user_outlined, title: 'Identity Verification', subtitle: verification[user.verificationStatus] ?? '', onTap: () => context.push('/account/verification')),
              const SizedBox(height: 10),
              MenuRow(icon: Icons.manage_accounts_outlined, title: 'Profile & Security', subtitle: 'Name, phone and password', onTap: () => context.push('/account/profile')),
              const SizedBox(height: 10),
              MenuRow(icon: Icons.support_agent_rounded, title: 'Help & Support', subtitle: 'Chat with a pharmacist, FAQs, contact us', onTap: () => context.push('/support')),
              const SizedBox(height: 18),
              const _HelpLinks(),
              const SizedBox(height: 16),
              OutlinedButton.icon(onPressed: () => context.read<AuthState>().logout(), icon: const Icon(Icons.logout_rounded), label: const Text('Sign out')),
            ],
          ),
        );
      },
    );
  }
}

class _HelpLinks extends StatelessWidget {
  const _HelpLinks();
  @override
  Widget build(BuildContext context) {
    Widget link(IconData icon, String label, String route) => ListTile(
      dense: true,
      leading: Icon(icon, color: AppColors.inkSoft, size: 20),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
      trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.hint),
      onTap: () => context.push(route),
    );
    return Panel(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Column(
        children: [
          link(Icons.local_shipping_outlined, 'Track an order', '/track'),
          link(Icons.help_outline, 'How prescriptions work', '/info/prescriptions'),
          link(Icons.delivery_dining_outlined, 'Delivery & pickup', '/info/delivery'),
          link(Icons.replay_outlined, 'Returns & refunds', '/info/returns'),
          link(Icons.quiz_outlined, 'FAQs', '/info/faq'),
          link(Icons.info_outline, 'About us', '/info/about'),
          link(Icons.privacy_tip_outlined, 'Privacy policy', '/info/privacy'),
          link(Icons.gavel_outlined, 'Terms of service', '/info/terms'),
          ListTile(
            dense: true,
            leading: const Icon(Icons.verified_outlined, color: AppColors.care600, size: 20),
            title: const Text('Registered with the Pharmacists Council of Nigeria', style: TextStyle(fontSize: 12.5)),
            subtitle: Text('${Site.pcnNumber} · ${Site.superintendent}', style: const TextStyle(fontSize: 11.5)),
          ),
        ],
      ),
    );
  }
}

/* ======================= Orders ======================= */

const _orderTabs = [
  ('All', <String>{}),
  ('Processing', {'AWAITING_RX_REVIEW', 'AWAITING_PAYMENT', 'PROCESSING', 'READY_FOR_PICKUP', 'DISPATCHED'}),
  ('Delivered', {'DELIVERED', 'COMPLETED'}),
  ('Cancelled', {'CANCELLED'}),
];

class MyOrdersScreen extends StatefulWidget {
  const MyOrdersScreen({super.key});
  @override
  State<MyOrdersScreen> createState() => _MyOrdersScreenState();
}

class _MyOrdersScreenState extends State<MyOrdersScreen> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Orders'),
        automaticallyImplyLeading: false,
        actions: [IconButton(tooltip: 'Track an order by number', onPressed: () => context.push('/track'), icon: const Icon(Icons.search_rounded))],
      ),
      body: user == null
          ? const SignInPrompt(icon: Icons.inventory_2_outlined, title: 'Your orders live here', message: 'Sign in to see your orders and follow deliveries live.', next: '/orders')
          : Loader(
              key: ValueKey(user.id),
              load: () async => ((await api.get('/orders'))['orders'] as List).map((o) => Order(o as Json)).toList(),
              builder: (context, orders, reload) {
                final statuses = _orderTabs[_tab].$2;
                final shown = statuses.isEmpty ? orders : orders.where((o) => statuses.contains(o.status)).toList();
                return Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(top: 4, bottom: 8),
                      child: ChipTabs(labels: [for (final t in _orderTabs) t.$1], index: _tab, onChanged: (i) => setState(() => _tab = i)),
                    ),
                    Expanded(
                      child: RefreshIndicator(
                        onRefresh: reload,
                        child: shown.isEmpty
                            ? ListView(
                                children: [
                                  EmptyState(
                                    icon: Icons.inventory_2_outlined,
                                    title: orders.isEmpty ? 'No orders yet' : 'Nothing here',
                                    message: orders.isEmpty ? "When you place an order it'll appear here with live status updates." : 'No ${_orderTabs[_tab].$1.toLowerCase()} orders.',
                                    action: orders.isEmpty ? FilledButton(onPressed: () => context.go('/shop'), child: const Text('Start shopping')) : null,
                                  ),
                                ],
                              )
                            : ListView.separated(
                                padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                                itemCount: shown.length,
                                separatorBuilder: (_, _) => const SizedBox(height: 10),
                                itemBuilder: (_, i) => _OrderCard(shown[i]),
                              ),
                      ),
                    ),
                  ],
                );
              },
            ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard(this.o);
  final Order o;
  @override
  Widget build(BuildContext context) {
    final first = o.items.isNotEmpty ? o.items.first : null;
    final live = o.status == 'DISPATCHED';
    return Panel(
      onTap: () => context.push('/order/${o.number}'),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 64,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.line),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: first == null ? const SizedBox(height: 64) : ProductArt(name: first.name, icon: first.icon, size: ArtSize.sm),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('#${o.number}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5)),
                const SizedBox(height: 2),
                Text('${fmtDate(o.createdAt)} · ${naira(o.totalKobo)}', style: const TextStyle(fontSize: 12.5, color: AppColors.inkMuted)),
                Text(
                  o.items.map((i) => i.name).join(', '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12.5, color: AppColors.inkMuted),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    OrderStatusPill(o.status),
                    const Spacer(),
                    Text(
                      live ? 'Track order' : 'View details',
                      style: const TextStyle(color: AppColors.brand600, fontWeight: FontWeight.w700, fontSize: 12.5),
                    ),
                    const Icon(Icons.arrow_forward_rounded, size: 15, color: AppColors.brand600),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/* ======================= Prescriptions ======================= */

class PrescriptionsScreen extends StatefulWidget {
  const PrescriptionsScreen({super.key});
  @override
  State<PrescriptionsScreen> createState() => _PrescriptionsScreenState();
}

class _PrescriptionsScreenState extends State<PrescriptionsScreen> {
  Key _key = UniqueKey();
  int _tab = 0;

  Future<void> _upload() async {
    final uploaded = await showModalBottomSheet<bool>(context: context, isScrollControlled: true, showDragHandle: true, builder: (_) => const _UploadPrescriptionSheet());
    if (uploaded == true) setState(() => _key = UniqueKey());
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user;
    return Scaffold(
      appBar: AppBar(title: const Text('Prescriptions'), automaticallyImplyLeading: context.canPop()),
      body: user == null
          ? const SignInPrompt(
              icon: Icons.description_outlined,
              title: 'Upload a prescription',
              message: 'Sign in to upload prescriptions. A pharmacist reviews them, usually within 2 hours, and you can reuse them until they expire.',
              next: '/prescriptions',
            )
          : Loader(
              key: _key,
              load: () async => ((await api.get('/prescriptions'))['prescriptions'] as List).map((p) => Prescription(p as Json)).toList(),
              builder: (context, list, reload) => RefreshIndicator(
                onRefresh: reload,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                  children: [
                    Segmented(options: const ['Upload New', 'My Prescriptions'], index: _tab, onChanged: (i) => setState(() => _tab = i)),
                    const SizedBox(height: 16),
                    if (_tab == 0) ...[
                      _UploadCard(onTap: _upload),
                      const SizedBox(height: 22),
                      if (list.isNotEmpty) ...[
                        SectionHeader('Recent Prescriptions', action: list.length > 3 ? 'See all' : null, onAction: () => setState(() => _tab = 1)),
                        for (final p in list.take(3)) Padding(padding: const EdgeInsets.only(bottom: 10), child: _RxRow(p)),
                      ] else
                        const Text('Upload once and reuse it for repeat orders until the prescription expires.', style: TextStyle(color: AppColors.inkMuted)),
                    ] else if (list.isEmpty)
                      EmptyState(
                        icon: Icons.description_outlined,
                        title: 'No prescriptions yet',
                        message: 'Upload one now, or attach it at checkout when you order a prescription medicine.',
                        action: FilledButton(onPressed: () => setState(() => _tab = 0), child: const Text('Upload prescription')),
                      )
                    else
                      for (final p in list) Padding(padding: const EdgeInsets.only(bottom: 10), child: _RxDetail(p)),
                  ],
                ),
              ),
            ),
    );
  }
}

class _UploadCard extends StatelessWidget {
  const _UploadCard({required this.onTap});
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => CustomPaint(
    painter: _DashedBorder(),
    child: Padding(
      padding: const EdgeInsets.fromLTRB(20, 26, 20, 20),
      child: Column(
        children: [
          const IconBadge(Icons.photo_camera_outlined, size: 60),
          const SizedBox(height: 14),
          Text('Upload Prescription', style: GoogleFonts.plusJakartaSans(fontSize: 17, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          const Text(
            'Take a photo or upload a PDF (max 8 MB)',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.inkMuted),
          ),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(onPressed: onTap, icon: const Icon(Icons.upload_rounded), label: const Text('Upload')),
          ),
        ],
      ),
    ),
  );
}

class _DashedBorder extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final r = RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(16));
    canvas.drawRRect(r, Paint()..color = AppColors.brand50.withValues(alpha: 0.5));
    final path = Path()..addRRect(r);
    final paint = Paint()
      ..color = AppColors.brand300
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    for (final m in path.computeMetrics()) {
      for (double d = 0; d < m.length; d += 12) {
        canvas.drawPath(m.extractPath(d, d + 6), paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

(IconData, Color, String) _rxStatus(Prescription p) {
  if (p.expired) return (Icons.history_toggle_off_rounded, AppColors.inkMuted, 'Expired');
  return switch (p.status) {
    'APPROVED' => (Icons.check_rounded, AppColors.care600, 'Approved'),
    'REJECTED' => (Icons.close_rounded, AppColors.brand600, 'Not accepted'),
    _ => (Icons.schedule_rounded, const Color(0xFFD97706), 'In review'),
  };
}

void _openRx(BuildContext context, Prescription p) => context.push('/file?path=${Uri.encodeComponent('/prescriptions/${p.id}/file')}&title=Prescription');

class _RxRow extends StatelessWidget {
  const _RxRow(this.p);
  final Prescription p;
  @override
  Widget build(BuildContext context) {
    final (icon, color, label) = _rxStatus(p);
    return Panel(
      onTap: () => _openRx(context, p),
      child: Row(
        children: [
          StatusIcon(icon, color: color),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Prescription · ${p.patientName}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                Text('$label · ${fmtDate(p.createdAt)}', style: TextStyle(fontSize: 12.5, color: color == AppColors.inkMuted ? AppColors.inkMuted : color)),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded, color: AppColors.hint),
        ],
      ),
    );
  }
}

class _RxDetail extends StatelessWidget {
  const _RxDetail(this.p);
  final Prescription p;
  @override
  Widget build(BuildContext context) {
    final (icon, color, _) = _rxStatus(p);
    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              StatusIcon(icon, color: color),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(p.patientName, style: const TextStyle(fontWeight: FontWeight.w700)),
                    Text([p.prescriberName, p.facility].whereType<String>().join(' · ').ifEmpty('Prescriber not specified'), style: const TextStyle(fontSize: 12.5, color: AppColors.inkMuted)),
                    Text('Uploaded ${fmtDate(p.createdAt)}${p.validUntil != null ? ' · valid until ${fmtDate(p.validUntil)}' : ''}', style: const TextStyle(fontSize: 12, color: AppColors.inkMuted)),
                  ],
                ),
              ),
              ReviewPill(p.status, expired: p.expired),
            ],
          ),
          if (p.reviewerNote != null)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: AlertBox(tone: p.status == 'REJECTED' ? AlertTone.error : AlertTone.info, message: "Pharmacist's note: ${p.reviewerNote}"),
            ),
          TextButton.icon(
            style: TextButton.styleFrom(padding: EdgeInsets.zero),
            onPressed: () => _openRx(context, p),
            icon: const Icon(Icons.open_in_new, size: 16),
            label: const Text('View file'),
          ),
        ],
      ),
    );
  }
}

extension on String {
  String ifEmpty(String fallback) => isEmpty ? fallback : this;
}

class _UploadPrescriptionSheet extends StatefulWidget {
  const _UploadPrescriptionSheet();
  @override
  State<_UploadPrescriptionSheet> createState() => _UploadPrescriptionSheetState();
}

class _UploadPrescriptionSheetState extends State<_UploadPrescriptionSheet> {
  PickedFile? _file;
  final _patient = TextEditingController(), _prescriber = TextEditingController(), _facility = TextEditingController(), _notes = TextEditingController();
  bool _busy = false;
  String? _error;
  Map<String, String> _fields = {};

  @override
  void initState() {
    super.initState();
    _patient.text = context.read<AuthState>().user?.fullName ?? '';
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(20, 0, 20, MediaQuery.viewInsetsOf(context).bottom + 20),
    child: SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Upload a prescription', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 14),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: AlertBox(tone: AlertTone.error, message: _error),
            ),
          FilePickField(label: 'Prescription file', file: _file, onChanged: (f) => setState(() => _file = f)),
          const SizedBox(height: 10),
          TextField(
            controller: _patient,
            decoration: InputDecoration(labelText: "Patient's full name", errorText: _fields['patientName']),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _prescriber,
            decoration: const InputDecoration(labelText: 'Prescriber (optional)', hintText: 'e.g. Dr. A. Yusuf'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _facility,
            decoration: const InputDecoration(labelText: 'Hospital or clinic (optional)'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _notes,
            maxLines: 2,
            decoration: const InputDecoration(labelText: 'Notes for the pharmacist (optional)', hintText: 'Allergies, other medicines you take, or questions'),
          ),
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: _busy
                ? null
                : () async {
                    if (_file == null) return setState(() => _error = 'Please choose a photo or PDF of your prescription.');
                    setState(() {
                      _busy = true;
                      _error = null;
                    });
                    try {
                      await api.upload(
                        '/prescriptions',
                        files: {'file': _file!.path},
                        fields: {
                          'patientName': _patient.text.trim(),
                          if (_prescriber.text.trim().isNotEmpty) 'prescriberName': _prescriber.text.trim(),
                          if (_facility.text.trim().isNotEmpty) 'facility': _facility.text.trim(),
                          if (_notes.text.trim().isNotEmpty) 'notes': _notes.text.trim(),
                        },
                      );
                      if (context.mounted) {
                        snack(context, 'Uploaded. A pharmacist will review it shortly.');
                        Navigator.pop(context, true);
                      }
                    } on ApiException catch (e) {
                      setState(() {
                        _error = e.message;
                        _fields = e.fields;
                      });
                    } finally {
                      if (mounted) setState(() => _busy = false);
                    }
                  },
            icon: const Icon(Icons.upload),
            label: const Text('Upload for review'),
          ),
          const SizedBox(height: 8),
          const Text(
            'Files are stored privately and only seen by our pharmacists. We keep prescription records for 5 years as required by PCN rules.',
            style: TextStyle(fontSize: 12, color: AppColors.inkMuted),
          ),
        ],
      ),
    ),
  );
}

/* ======================= Identity verification ======================= */

class VerificationScreen extends StatefulWidget {
  const VerificationScreen({super.key});
  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  Key _key = UniqueKey();
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Identity verification')),
    body: Loader(
      key: _key,
      load: () => api.get('/verification'),
      builder: (context, data, _) {
        final status = data['status'] as String;
        final history = (data['history'] as List).cast<Json>();
        final latest = history.firstOrNull;
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Required only for controlled medicines and for doctors or pharmacists buying for practice.', style: TextStyle(color: AppColors.inkMuted)),
            const SizedBox(height: 12),
            CardBox(
              child: Row(
                children: [
                  Icon(status == 'APPROVED' ? Icons.verified : Icons.verified_user_outlined, color: status == 'APPROVED' ? AppColors.care600 : AppColors.inkSoft),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      latest == null ? "You haven't submitted documents yet." : 'Last submitted ${fmtDate(latest['createdAt'] as String)} · ${idTypeLabel[latest['idType']] ?? latest['idType']}',
                    ),
                  ),
                  ReviewPill(status),
                ],
              ),
            ),
            const SizedBox(height: 12),
            if (status == 'APPROVED') const AlertBox(tone: AlertTone.success, title: "You're verified", message: 'You can order controlled medicines with a valid prescription.'),
            if (status == 'PENDING') const AlertBox(title: "We're reviewing your documents", message: "This usually takes less than one working day. We'll email you as soon as it's done."),
            if (status == 'REJECTED' && latest?['reviewerNote'] != null)
              AlertBox(tone: AlertTone.error, title: "We couldn't verify your account", message: '${latest!['reviewerNote']} Please submit new documents below.'),
            if (status == 'UNVERIFIED' || status == 'REJECTED')
              _VerificationForm(
                onDone: () async {
                  await context.read<AuthState>().refresh();
                  setState(() => _key = UniqueKey());
                },
              ),
            const SizedBox(height: 12),
            const CardBox(
              child: Text(
                'Why we ask: Nigerian law requires pharmacies to confirm who they supply controlled medicines to. Your ID is checked by a pharmacist, stored privately, and never shared except where the law requires it (PCN, NAFDAC or NDLEA).',
                style: TextStyle(color: AppColors.inkSoft, height: 1.5),
              ),
            ),
          ],
        );
      },
    ),
  );
}

class _VerificationForm extends StatefulWidget {
  const _VerificationForm({required this.onDone});
  final Future<void> Function() onDone;
  @override
  State<_VerificationForm> createState() => _VerificationFormState();
}

class _VerificationFormState extends State<_VerificationForm> {
  String _type = 'PATIENT', _idType = 'NIN';
  PickedFile? _id, _license;
  final _licenseNumber = TextEditingController();
  bool _consent = false, _busy = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final professional = _type != 'PATIENT';
    return CardBox(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Submit your documents', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
          const SizedBox(height: 12),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: AlertBox(tone: AlertTone.error, message: _error),
            ),
          const Text('I am a…', style: TextStyle(fontWeight: FontWeight.w600)),
          for (final (v, t, s) in const [
            ('PATIENT', 'Patient or caregiver', 'Buying for yourself or someone you care for.'),
            ('DOCTOR', 'Medical doctor', 'Requires your MDCN licence.'),
            ('PHARMACIST', 'Pharmacist', 'Requires your PCN annual licence.'),
          ])
            RadioListTile<String>(
              contentPadding: EdgeInsets.zero,
              value: v,
              groupValue: _type,
              onChanged: (x) => setState(() => _type = x!),
              title: Text(t, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text(s),
            ),
          DropdownButtonFormField<String>(
            initialValue: _idType,
            decoration: const InputDecoration(labelText: 'ID type'),
            items: [for (final e in idTypeLabel.entries) DropdownMenuItem(value: e.key, child: Text(e.value))],
            onChanged: (v) => setState(() => _idType = v!),
          ),
          const SizedBox(height: 12),
          FilePickField(label: 'Photo of your ID', file: _id, onChanged: (f) => setState(() => _id = f), hint: 'All four corners visible, text readable.'),
          if (professional) ...[
            const SizedBox(height: 12),
            TextField(
              controller: _licenseNumber,
              decoration: InputDecoration(labelText: _type == 'DOCTOR' ? 'MDCN folio/licence number' : 'PCN registration number'),
            ),
            const SizedBox(height: 12),
            FilePickField(label: _type == 'DOCTOR' ? 'MDCN practising licence' : 'PCN annual licence', file: _license, onChanged: (f) => setState(() => _license = f)),
          ],
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            value: _consent,
            onChanged: (v) => setState(() => _consent = v!),
            title: const Text('I confirm these documents are genuine and belong to me, and I consent to MGK Pharmacy verifying them.', style: TextStyle(fontSize: 13)),
          ),
          FilledButton(
            onPressed: _busy
                ? null
                : () async {
                    if (_id == null) return setState(() => _error = 'Please upload a photo of your ID.');
                    if (professional && (_license == null || _licenseNumber.text.trim().isEmpty)) return setState(() => _error = 'Please add your licence number and a copy of your licence.');
                    setState(() {
                      _busy = true;
                      _error = null;
                    });
                    try {
                      await api.upload(
                        '/verification',
                        files: {'idDocument': _id!.path, if (professional) 'license': _license!.path},
                        fields: {'type': _type, 'idType': _idType, 'consent': '$_consent', if (professional) 'licenseNumber': _licenseNumber.text.trim()},
                      );
                      await widget.onDone();
                    } on ApiException catch (e) {
                      setState(() => _error = e.fields['consent'] ?? e.message);
                    } finally {
                      if (mounted) setState(() => _busy = false);
                    }
                  },
            child: const Text('Submit for verification'),
          ),
        ],
      ),
    );
  }
}

/* ======================= Addresses ======================= */

class AddressesScreen extends StatefulWidget {
  const AddressesScreen({super.key});
  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  Key _key = UniqueKey();
  void _refresh() => setState(() => _key = UniqueKey());

  Future<void> _edit([Address? a]) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _AddressSheet(address: a),
    );
    if (saved == true) _refresh();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Addresses')),
    floatingActionButton: FloatingActionButton.extended(onPressed: _edit, icon: const Icon(Icons.add), label: const Text('Add address')),
    body: Loader(
      key: _key,
      load: () async => ((await api.get('/account/addresses'))['addresses'] as List).map((a) => Address(a as Json)).toList(),
      builder: (context, list, _) => list.isEmpty
          ? Center(
              child: EmptyState(
                icon: Icons.place_outlined,
                title: 'No saved addresses',
                message: 'Saved addresses appear at checkout so you never retype them.',
                action: FilledButton(onPressed: _edit, child: const Text('Add an address')),
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
              itemCount: list.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (_, i) {
                final a = list[i];
                return CardBox(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.place_outlined, color: AppColors.brand600, size: 18),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(a.label, style: const TextStyle(fontWeight: FontWeight.w700)),
                          ),
                          if (a.isDefault) const Pill('Default', bg: AppColors.care100, fg: AppColors.care700),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${a.fullName} · ${fmtPhone(a.phone)}\n${a.oneLine}${a.landmark != null ? '\nLandmark: ${a.landmark}' : ''}',
                        style: const TextStyle(color: AppColors.inkSoft, height: 1.45),
                      ),
                      const Divider(height: 20),
                      Wrap(
                        spacing: 4,
                        children: [
                          TextButton.icon(onPressed: () => _edit(a), icon: const Icon(Icons.edit_outlined, size: 16), label: const Text('Edit')),
                          if (!a.isDefault)
                            TextButton.icon(
                              onPressed: () async {
                                if (await runAction(context, () => api.put('/account/addresses/${a.id}', {...a.j, 'isDefault': true})) != null) _refresh();
                              },
                              icon: const Icon(Icons.star_outline, size: 16),
                              label: const Text('Make default'),
                            ),
                          TextButton.icon(
                            onPressed: () async {
                              if (!await confirm(context, title: 'Delete address?', message: 'Delete the "${a.label}" address?', ok: 'Delete', danger: true)) return;
                              if (!context.mounted) return;
                              if (await runAction(context, () => api.delete('/account/addresses/${a.id}')) != null) _refresh();
                            },
                            icon: const Icon(Icons.delete_outline, size: 16),
                            label: const Text('Delete'),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
    ),
  );
}

class _AddressSheet extends StatefulWidget {
  const _AddressSheet({this.address});
  final Address? address;
  @override
  State<_AddressSheet> createState() => _AddressSheetState();
}

class _AddressSheetState extends State<_AddressSheet> {
  late final a = widget.address;
  late final _label = TextEditingController(text: a?.label ?? 'Home');
  late final _name = TextEditingController(text: a?.fullName ?? context.read<AuthState>().user?.fullName ?? '');
  late final _phone = TextEditingController(text: fmtPhone(a?.phone ?? context.read<AuthState>().user?.phone));
  late final _line1 = TextEditingController(text: a?.line1 ?? '');
  late final _line2 = TextEditingController(text: a?.line2 ?? '');
  late final _city = TextEditingController(text: a?.city ?? '');
  late final _landmark = TextEditingController(text: a?.landmark ?? '');
  late String _state = a?.state ?? 'Kano';
  late bool _default = a?.isDefault ?? false;
  bool _busy = false;
  Map<String, String> _fields = {};
  String? _error;

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(20, 0, 20, MediaQuery.viewInsetsOf(context).bottom + 20),
    child: SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(a == null ? 'New address' : 'Edit address', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: AlertBox(tone: AlertTone.error, message: _error),
            ),
          TextField(
            controller: _label,
            decoration: const InputDecoration(labelText: 'Label', hintText: 'Home, Office…'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _name,
            decoration: InputDecoration(labelText: "Recipient's full name", errorText: _fields['fullName']),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(labelText: 'Phone', errorText: _fields['phone']),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _line1,
            decoration: InputDecoration(labelText: 'Street address', errorText: _fields['line1']),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _line2,
            decoration: const InputDecoration(labelText: 'Apartment, estate or area (optional)'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _city,
            decoration: InputDecoration(labelText: 'Town / city', errorText: _fields['city']),
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            initialValue: _state,
            decoration: const InputDecoration(labelText: 'State'),
            items: [for (final s in nigerianStates) DropdownMenuItem(value: s, child: Text(s))],
            onChanged: (v) => setState(() => _state = v!),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _landmark,
            decoration: const InputDecoration(labelText: 'Nearest landmark (optional)'),
          ),
          SwitchListTile(contentPadding: EdgeInsets.zero, value: _default, onChanged: (v) => setState(() => _default = v), title: const Text('Use as my default address')),
          FilledButton(
            onPressed: _busy
                ? null
                : () async {
                    setState(() {
                      _busy = true;
                      _fields = {};
                      _error = null;
                    });
                    final body = {
                      'label': _label.text.trim(),
                      'fullName': _name.text.trim(),
                      'phone': _phone.text.trim(),
                      'line1': _line1.text.trim(),
                      'line2': _line2.text.trim().isEmpty ? null : _line2.text.trim(),
                      'city': _city.text.trim(),
                      'state': _state,
                      'landmark': _landmark.text.trim().isEmpty ? null : _landmark.text.trim(),
                      'isDefault': _default,
                    };
                    try {
                      a == null ? await api.post('/account/addresses', body) : await api.put('/account/addresses/${a!.id}', body);
                      if (context.mounted) Navigator.pop(context, true);
                    } on ApiException catch (e) {
                      setState(() {
                        _fields = e.fields;
                        _error = e.message;
                      });
                    } finally {
                      if (mounted) setState(() => _busy = false);
                    }
                  },
            child: const Text('Save address'),
          ),
        ],
      ),
    ),
  );
}

/* ======================= Profile & security ======================= */

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late final user = context.read<AuthState>().user!;
  late final _first = TextEditingController(text: user.firstName);
  late final _last = TextEditingController(text: user.lastName);
  late final _phone = TextEditingController(text: fmtPhone(user.phone));
  final _current = TextEditingController(), _new = TextEditingController();
  Map<String, String> _fields = {};

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Profile & security')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        CardBox(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Personal details', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
              const SizedBox(height: 12),
              TextField(
                controller: _first,
                decoration: InputDecoration(labelText: 'First name', errorText: _fields['firstName']),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _last,
                decoration: InputDecoration(labelText: 'Last name', errorText: _fields['lastName']),
              ),
              const SizedBox(height: 10),
              TextField(
                enabled: false,
                controller: TextEditingController(text: user.email),
                decoration: const InputDecoration(labelText: 'Email', helperText: 'Contact us to change the email on your account.'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(labelText: 'Mobile number', errorText: _fields['phone']),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () async {
                  try {
                    final res = await api.patch('/account/profile', {'firstName': _first.text.trim(), 'lastName': _last.text.trim(), 'phone': _phone.text.trim()});
                    if (!context.mounted) return;
                    context.read<AuthState>().setUser(res['user'] as Json);
                    setState(() => _fields = {});
                    snack(context, 'Your details have been updated.');
                  } on ApiException catch (e) {
                    setState(() => _fields = e.fields);
                    if (context.mounted) snack(context, e.message, error: true);
                  }
                },
                child: const Text('Save changes'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        CardBox(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Change password', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
              const SizedBox(height: 12),
              TextField(
                controller: _current,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Current password'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _new,
                obscureText: true,
                decoration: InputDecoration(labelText: 'New password', helperText: 'At least 8 characters, with a letter and a number.', errorText: _fields['newPassword']),
              ),
              const SizedBox(height: 12),
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: AppColors.ink),
                onPressed: () async {
                  try {
                    await context.read<AuthState>().changePassword(_current.text, _new.text);
                    _current.clear();
                    _new.clear();
                    if (context.mounted) snack(context, 'Password changed. Other devices have been signed out.');
                  } on ApiException catch (e) {
                    setState(() => _fields = e.fields);
                    if (context.mounted) snack(context, e.message, error: true);
                  }
                },
                child: const Text('Update password'),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}
