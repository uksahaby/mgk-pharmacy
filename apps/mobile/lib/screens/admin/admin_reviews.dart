import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';
import 'admin_home.dart';

const _rejectReasons = [
  'The prescription is unclear or unreadable',
  'The prescription is older than 6 months',
  "The patient's name doesn't match",
  "The prescriber's signature or details are missing",
  "The prescribed medicine or dose doesn't match the order",
];

class _StatusTabs extends StatelessWidget {
  const _StatusTabs({required this.value, required this.onChanged});
  final String value;
  final ValueChanged<String> onChanged;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
        child: SegmentedButton<String>(
          segments: const [ButtonSegment(value: 'PENDING', label: Text('To review')), ButtonSegment(value: 'APPROVED', label: Text('Approved')), ButtonSegment(value: 'REJECTED', label: Text('Rejected'))],
          selected: {value},
          onSelectionChanged: (s) => onChanged(s.first),
          showSelectedIcon: false,
        ),
      );
}

/// Approve / reject controls shared by prescriptions and identity verifications.
class _ReviewControls extends StatefulWidget {
  const _ReviewControls({required this.endpoint, required this.onDone, this.withValidity = false});
  final String endpoint;
  final VoidCallback onDone;
  final bool withValidity;
  @override
  State<_ReviewControls> createState() => _ReviewControlsState();
}

class _ReviewControlsState extends State<_ReviewControls> {
  bool _rejecting = false, _busy = false;
  int _validDays = 180;
  final _note = TextEditingController();

  Future<void> _submit(String decision) async {
    setState(() => _busy = true);
    final res = await runAction(context, () => api.post(widget.endpoint, {'decision': decision, if (_note.text.trim().isNotEmpty) 'note': _note.text.trim(), if (widget.withValidity) 'validDays': _validDays}),
        success: decision == 'APPROVED' ? 'Approved' : 'Rejected');
    if (mounted) setState(() => _busy = false);
    if (res != null) widget.onDone();
  }

  @override
  Widget build(BuildContext context) {
    if (!_rejecting) {
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (widget.withValidity)
          DropdownButtonFormField<int>(
            initialValue: _validDays,
            decoration: const InputDecoration(labelText: 'Valid for repeat orders'),
            items: const [DropdownMenuItem(value: 30, child: Text('30 days')), DropdownMenuItem(value: 90, child: Text('3 months')), DropdownMenuItem(value: 180, child: Text('6 months')), DropdownMenuItem(value: 365, child: Text('12 months'))],
            onChanged: (v) => setState(() => _validDays = v!),
          ),
        const SizedBox(height: 8),
        TextField(controller: _note, decoration: const InputDecoration(labelText: 'Note to customer (optional)')),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: FilledButton.icon(style: FilledButton.styleFrom(backgroundColor: AppColors.care600), onPressed: _busy ? null : () => _submit('APPROVED'), icon: const Icon(Icons.check), label: const Text('Approve'))),
          const SizedBox(width: 10),
          Expanded(child: OutlinedButton.icon(onPressed: _busy ? null : () => setState(() => _rejecting = true), icon: const Icon(Icons.close, color: AppColors.brand700), label: const Text('Reject', style: TextStyle(color: AppColors.brand700)))),
        ]),
      ]);
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const Text('Reason (sent to the customer)', style: TextStyle(fontWeight: FontWeight.w600)),
      Wrap(spacing: 6, children: [for (final r in _rejectReasons) ActionChip(label: Text(r, style: const TextStyle(fontSize: 12)), onPressed: () => setState(() => _note.text = r))]),
      const SizedBox(height: 8),
      TextField(controller: _note, maxLines: 2, onChanged: (_) => setState(() {}), decoration: const InputDecoration(hintText: 'Or write your own')),
      const SizedBox(height: 10),
      Row(children: [
        Expanded(child: FilledButton(onPressed: _busy || _note.text.trim().isEmpty ? null : () => _submit('REJECTED'), child: const Text('Confirm rejection'))),
        const SizedBox(width: 10),
        Expanded(child: OutlinedButton(onPressed: () => setState(() => _rejecting = false), child: const Text('Back'))),
      ]),
    ]);
  }
}

class AdminPrescriptionsScreen extends StatefulWidget {
  const AdminPrescriptionsScreen({super.key});
  @override
  State<AdminPrescriptionsScreen> createState() => _AdminPrescriptionsScreenState();
}

class _AdminPrescriptionsScreenState extends State<AdminPrescriptionsScreen> {
  String _status = 'PENDING';
  Key _key = UniqueKey();

  @override
  Widget build(BuildContext context) => AdminScaffold(
        title: 'Prescriptions',
        permission: 'prescriptions.review',
        body: Column(children: [
          _StatusTabs(value: _status, onChanged: (s) => setState(() {
                _status = s;
                _key = UniqueKey();
              })),
          Expanded(
            child: Loader(
              key: _key,
              load: () async => ((await api.get('/admin/prescriptions', query: {'status': _status}))['prescriptions'] as List).cast<Json>(),
              builder: (context, list, reload) => list.isEmpty
                  ? Center(child: EmptyState(icon: Icons.fact_check_outlined, title: _status == 'PENDING' ? 'All caught up' : 'Nothing here yet', message: _status == 'PENDING' ? 'No prescriptions are waiting for review.' : null))
                  : RefreshIndicator(
                      onRefresh: reload,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: list.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (_, i) {
                          final p = Prescription(list[i]);
                          final customer = list[i]['customer'] as Json;
                          final orders = (list[i]['orders'] as List).cast<Json>();
                          final filePath = '/admin/prescriptions/${p.id}/file';
                          return CardBox(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                              Row(children: [
                                Expanded(
                                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(p.patientName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                                    Text([p.prescriberName, p.facility].whereType<String>().join(' · '), style: const TextStyle(color: AppColors.inkMuted, fontSize: 12.5)),
                                    if (p.issuedOn != null) Text('Issued ${fmtDate(p.issuedOn)}', style: const TextStyle(color: AppColors.inkMuted, fontSize: 12.5)),
                                  ]),
                                ),
                                ReviewPill(p.status, expired: p.expired),
                              ]),
                              const SizedBox(height: 10),
                              OutlinedButton.icon(
                                onPressed: () => context.push('/file?path=${Uri.encodeComponent(filePath)}&title=${Uri.encodeComponent('Prescription · ${p.patientName}')}'),
                                icon: Icon(p.mimeType.contains('pdf') ? Icons.picture_as_pdf_outlined : Icons.image_outlined),
                                label: const Text('Open prescription'),
                              ),
                              const SizedBox(height: 10),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(12)),
                                child: Text('Account: ${customer['firstName']} ${customer['lastName']} · ${fmtPhone(customer['phone'] as String?)}\nUploaded ${fmtDateTime(p.createdAt)}', style: const TextStyle(height: 1.5)),
                              ),
                              if (p.notes != null) Padding(padding: const EdgeInsets.only(top: 8), child: AlertBox(tone: AlertTone.warning, message: 'Patient note: ${p.notes}')),
                              for (final o in orders)
                                Padding(
                                  padding: const EdgeInsets.only(top: 8),
                                  child: InkWell(
                                    onTap: () => context.push('/admin/orders/${o['number']}'),
                                    child: Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(border: Border.all(color: AppColors.border), borderRadius: BorderRadius.circular(12)),
                                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                        Row(children: [Expanded(child: Text(o['number'] as String, style: const TextStyle(fontWeight: FontWeight.w700))), OrderStatusPill(o['status'] as String)]),
                                        for (final it in (o['items'] as List).cast<Json>()) Text('${it['quantity']} × ${it['name']}${it['rxStatus'] != 'OTC' ? '  (Rx)' : ''}'),
                                      ]),
                                    ),
                                  ),
                                ),
                              if (p.reviewerNote != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text('Review note: ${p.reviewerNote}', style: const TextStyle(color: AppColors.inkMuted))),
                              if (p.status == 'PENDING') ...[
                                const Divider(height: 24),
                                _ReviewControls(endpoint: '/admin/prescriptions/${p.id}/review', withValidity: true, onDone: () => setState(() => _key = UniqueKey())),
                              ],
                            ]),
                          );
                        },
                      ),
                    ),
            ),
          ),
        ]),
      );
}

class AdminVerificationsScreen extends StatefulWidget {
  const AdminVerificationsScreen({super.key});
  @override
  State<AdminVerificationsScreen> createState() => _AdminVerificationsScreenState();
}

class _AdminVerificationsScreenState extends State<AdminVerificationsScreen> {
  String _status = 'PENDING';
  Key _key = UniqueKey();

  @override
  Widget build(BuildContext context) => AdminScaffold(
        title: 'Verifications',
        permission: 'verifications.review',
        body: Column(children: [
          _StatusTabs(value: _status, onChanged: (s) => setState(() {
                _status = s;
                _key = UniqueKey();
              })),
          Expanded(
            child: Loader(
              key: _key,
              load: () async => ((await api.get('/admin/verifications', query: {'status': _status}))['verifications'] as List).cast<Json>(),
              builder: (context, list, reload) => list.isEmpty
                  ? Center(child: EmptyState(icon: Icons.verified_user_outlined, title: _status == 'PENDING' ? 'All caught up' : 'Nothing here yet'))
                  : RefreshIndicator(
                      onRefresh: reload,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: list.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (_, i) {
                          final v = list[i];
                          final c = v['customer'] as Json;
                          return CardBox(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                              Row(children: [
                                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('${c['firstName']} ${c['lastName']}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)), Text('${c['email']} · ${fmtPhone(c['phone'] as String?)}', style: const TextStyle(color: AppColors.inkMuted, fontSize: 12.5))])),
                                ReviewPill(v['status'] as String),
                              ]),
                              const SizedBox(height: 10),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(12)),
                                child: Text(
                                  'Applying as: ${const {'PATIENT': 'Patient / caregiver', 'DOCTOR': 'Medical doctor', 'PHARMACIST': 'Pharmacist'}[v['type']]}\nID: ${idTypeLabel[v['idType']] ?? v['idType']}${v['licenseNumber'] != null ? '\nLicence no.: ${v['licenseNumber']}' : ''}\nSubmitted ${fmtDateTime(v['createdAt'] as String)}',
                                  style: const TextStyle(height: 1.5),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Wrap(spacing: 8, children: [
                                OutlinedButton.icon(onPressed: () => context.push('/file?path=${Uri.encodeComponent('/admin/verifications/${v['id']}/id')}&title=ID document'), icon: const Icon(Icons.badge_outlined), label: const Text('View ID')),
                                if (v['hasLicense'] == true)
                                  OutlinedButton.icon(onPressed: () => context.push('/file?path=${Uri.encodeComponent('/admin/verifications/${v['id']}/license')}&title=Licence'), icon: const Icon(Icons.workspace_premium_outlined), label: const Text('View licence')),
                              ]),
                              if (v['reviewerNote'] != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text('Note: ${v['reviewerNote']}', style: const TextStyle(color: AppColors.inkMuted))),
                              if (v['status'] == 'PENDING') ...[
                                const Divider(height: 24),
                                _ReviewControls(endpoint: '/admin/verifications/${v['id']}/review', onDone: () => setState(() => _key = UniqueKey())),
                              ],
                            ]),
                          );
                        },
                      ),
                    ),
            ),
          ),
        ]),
      );
}
