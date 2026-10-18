import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../state/auth_state.dart';
import '../../widgets/common.dart';
import 'admin_home.dart';

class AdminCustomersScreen extends StatefulWidget {
  const AdminCustomersScreen({super.key});
  @override
  State<AdminCustomersScreen> createState() => _AdminCustomersScreenState();
}

class _AdminCustomersScreenState extends State<AdminCustomersScreen> {
  final _q = TextEditingController();
  Key _key = UniqueKey();
  @override
  Widget build(BuildContext context) => AdminScaffold(
        title: 'Customers',
        permission: 'customers.view',
        body: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: TextField(controller: _q, textInputAction: TextInputAction.search, onSubmitted: (_) => setState(() => _key = UniqueKey()), decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Email, surname or phone')),
          ),
          Expanded(
            child: Loader(
              key: _key,
              load: () async => ((await api.get('/admin/customers', query: {'q': _q.text.trim()}))['customers'] as List).cast<Json>(),
              builder: (context, list, reload) => RefreshIndicator(
                onRefresh: reload,
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final c = list[i];
                    return CardBox(
                      padding: const EdgeInsets.all(12),
                      child: Row(children: [
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(c['name'] as String, style: const TextStyle(fontWeight: FontWeight.w700)),
                            Text('${c['email']}${c['phone'] != null ? ' · ${fmtPhone(c['phone'] as String)}' : ''}', style: const TextStyle(fontSize: 12.5, color: AppColors.inkMuted)),
                            Text('Joined ${fmtDate(c['createdAt'] as String)} · ${plural((c['orders'] as num).toInt(), 'order')}', style: const TextStyle(fontSize: 12, color: AppColors.inkMuted)),
                          ]),
                        ),
                        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [Text(naira(c['spentKobo'] as num), style: const TextStyle(fontWeight: FontWeight.w800)), const SizedBox(height: 4), ReviewPill(c['verificationStatus'] as String)]),
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

class AdminMessagesScreen extends StatefulWidget {
  const AdminMessagesScreen({super.key});
  @override
  State<AdminMessagesScreen> createState() => _AdminMessagesScreenState();
}

class _AdminMessagesScreenState extends State<AdminMessagesScreen> {
  Key _key = UniqueKey();
  @override
  Widget build(BuildContext context) => AdminScaffold(
        title: 'Messages',
        permission: 'messages.view',
        body: Loader(
          key: _key,
          load: () async => ((await api.get('/admin/messages'))['messages'] as List).cast<Json>(),
          builder: (context, list, reload) => list.isEmpty
              ? const Center(child: EmptyState(icon: Icons.inbox_outlined, title: 'No messages'))
              : RefreshIndicator(
                  onRefresh: reload,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: list.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final m = list[i];
                      final handled = m['handled'] == true;
                      return Opacity(
                        opacity: handled ? 0.6 : 1,
                        child: CardBox(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Row(children: [
                              Expanded(child: Text(m['name'] as String, style: const TextStyle(fontWeight: FontWeight.w700))),
                              Pill(const {'ORDER': 'Order', 'PRESCRIPTION': 'Prescription', 'PRODUCT': 'Product', 'FEEDBACK': 'Feedback', 'OTHER': 'Other'}[m['topic']] ?? '${m['topic']}', bg: AppColors.slate100, fg: AppColors.inkSoft),
                            ]),
                            Text('${m['email']}${m['phone'] != null ? ' · ${m['phone']}' : ''} · ${fmtDateTime(m['createdAt'] as String)}', style: const TextStyle(fontSize: 12, color: AppColors.inkMuted)),
                            const SizedBox(height: 8),
                            Text(m['message'] as String, style: const TextStyle(height: 1.45)),
                            const SizedBox(height: 4),
                            Row(children: [
                              TextButton.icon(onPressed: () => openLink('mailto:${m['email']}'), icon: const Icon(Icons.reply, size: 16), label: const Text('Reply')),
                              const Spacer(),
                              if (handled)
                                const Pill('Handled', bg: AppColors.care100, fg: AppColors.care700)
                              else
                                OutlinedButton(
                                  onPressed: () async {
                                    if (await runAction(context, () => api.post('/admin/messages/${m['id']}/handled')) != null) setState(() => _key = UniqueKey());
                                  },
                                  child: const Text('Mark handled'),
                                ),
                            ]),
                          ]),
                        ),
                      );
                    },
                  ),
                ),
        ),
      );
}

/* ======================= Staff & roles ======================= */

const _permissionLabels = {
  'dashboard.view': 'Staff dashboard',
  'orders.view': 'View orders',
  'orders.manage': 'Manage orders, payments & dispatch',
  'prescriptions.review': 'Review prescriptions',
  'verifications.review': 'Review ID verifications',
  'products.manage': 'Manage products',
  'inventory.manage': 'Manage stock & expiry',
  'customers.view': 'View customers',
  'messages.view': 'Read contact messages',
  'staff.manage': 'Manage staff & roles',
  'deliveries.ride': 'Rider app',
};

class AdminStaffScreen extends StatefulWidget {
  const AdminStaffScreen({super.key});
  @override
  State<AdminStaffScreen> createState() => _AdminStaffScreenState();
}

class _AdminStaffScreenState extends State<AdminStaffScreen> {
  int _tab = 0;
  @override
  Widget build(BuildContext context) => AdminScaffold(
        title: 'Staff & roles',
        permission: 'staff.manage',
        body: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: SegmentedButton<int>(
              segments: const [ButtonSegment(value: 0, label: Text('People')), ButtonSegment(value: 1, label: Text('Roles')), ButtonSegment(value: 2, label: Text('Activity'))],
              selected: {_tab},
              showSelectedIcon: false,
              onSelectionChanged: (s) => setState(() => _tab = s.first),
            ),
          ),
          Expanded(child: [const _People(), const _Roles(), const _Activity()][_tab]),
        ]),
      );
}

class _People extends StatefulWidget {
  const _People();
  @override
  State<_People> createState() => _PeopleState();
}

class _PeopleState extends State<_People> {
  final _q = TextEditingController();
  String _role = 'STAFF';
  String _status = '';
  Key _key = UniqueKey();
  List<Json> _roles = [];

  @override
  void initState() {
    super.initState();
    api.get('/admin/roles').then((r) => mounted ? setState(() => _roles = (r['roles'] as List).cast<Json>()) : null).catchError((_) => null);
  }

  void _refresh() => setState(() => _key = UniqueKey());

  Future<void> _showCredential(String name, String email, String password, bool created) => showDialog<void>(
        context: context,
        builder: (c) => AlertDialog(
          title: Text(created ? 'Account created for $name' : 'New temporary password for $name'),
          content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Give these details to them in person or by phone. This password is shown only once, and they must change it when they sign in.'),
            const SizedBox(height: 12),
            Text(email, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            SelectableText(password, style: const TextStyle(fontFamily: 'monospace', fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: 1)),
          ]),
          actions: [
            TextButton.icon(onPressed: () => copyText(c, password, 'Temporary password'), icon: const Icon(Icons.copy, size: 16), label: const Text('Copy')),
            FilledButton(onPressed: () => Navigator.pop(c), child: const Text('Done')),
          ],
        ),
      );

  Future<void> _add() async {
    final res = await showModalBottomSheet<Json>(context: context, isScrollControlled: true, showDragHandle: true, builder: (_) => _AddPersonSheet(roles: _roles));
    if (res == null || !mounted) return;
    _refresh();
    await _showCredential(res['name'] as String, res['email'] as String, res['password'] as String, true);
  }

  @override
  Widget build(BuildContext context) {
    final me = context.watch<AuthState>().user;
    if (me == null) return const SizedBox.shrink();
    return Stack(children: [
      Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: TextField(controller: _q, textInputAction: TextInputAction.search, onSubmitted: (_) => _refresh(), decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Name, email or phone')),
        ),
        SizedBox(
          height: 48,
          child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.fromLTRB(16, 6, 16, 0), children: [
            for (final (v, l) in [('STAFF', 'All staff'), ...[for (final r in _roles) (r['role'] as String, '${r['label']}s')], ('', 'Everyone')])
              Padding(padding: const EdgeInsets.only(right: 6), child: ChoiceChip(label: Text(l), selected: _role == v, onSelected: (_) {
                _role = v;
                _refresh();
              })),
            ChoiceChip(label: const Text('Deactivated'), selected: _status == 'inactive', onSelected: (s) {
              _status = s ? 'inactive' : '';
              _refresh();
            }),
          ]),
        ),
        Expanded(
          child: Loader(
            key: _key,
            load: () async => ((await api.get('/admin/users', query: {'q': _q.text.trim(), 'role': _role, 'status': _status}))['users'] as List).cast<Json>(),
            builder: (context, users, reload) => RefreshIndicator(
              onRefresh: reload,
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 100),
                itemCount: users.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (_, i) {
                  final u = users[i];
                  final self = u['id'] == me.id;
                  final active = u['active'] == true;
                  final name = '${u['firstName']} ${u['lastName']}';
                  return CardBox(
                    color: active ? null : AppColors.slate50,
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Expanded(child: Text(self ? '$name (you)' : name, style: const TextStyle(fontWeight: FontWeight.w800))),
                        if (!active)
                          const Pill('Deactivated', bg: Color(0xFFE2E8F0), fg: AppColors.inkSoft)
                        else if (u['mustChangePassword'] == true)
                          const Pill('Invited', bg: AppColors.amber100, fg: AppColors.amber800)
                        else
                          const Pill('Active', bg: AppColors.care100, fg: AppColors.care700),
                      ]),
                      Text('${u['email']}${u['phone'] != null ? ' · ${fmtPhone(u['phone'] as String)}' : ''}', style: const TextStyle(fontSize: 12.5, color: AppColors.inkMuted)),
                      Text(u['lastLoginAt'] != null ? 'Last sign-in ${fmtDateTime(u['lastLoginAt'] as String)}' : 'Never signed in · added ${fmtDate(u['createdAt'] as String)}', style: const TextStyle(fontSize: 12, color: AppColors.inkMuted)),
                      const SizedBox(height: 8),
                      if (self)
                        RolePill(u['role'] as String)
                      else
                        Row(children: [
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              initialValue: u['role'] as String,
                              isDense: true,
                              decoration: const InputDecoration(labelText: 'Role', contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
                              items: [for (final r in _roles) DropdownMenuItem(value: r['role'] as String, child: Text(r['label'] as String))],
                              onChanged: !active
                                  ? null
                                  : (v) async {
                                      if (v == null || v == u['role']) return;
                                      if (!await confirm(context, title: 'Change role?', message: "Change $name from ${roleLabel[u['role']]} to ${roleLabel[v]}? They'll be signed out so the change takes effect.")) {
                                        _refresh();
                                        return;
                                      }
                                      if (!context.mounted) return;
                                      await runAction(context, () => api.patch('/admin/users/${u['id']}', {'role': v}), success: 'Role updated');
                                      _refresh();
                                    },
                            ),
                          ),
                          PopupMenuButton<String>(
                            onSelected: (a) async {
                              if (a == 'reset') {
                                if (!await confirm(context, title: 'Reset password?', message: "$name will be signed out everywhere and must set a new password.")) return;
                                if (!context.mounted) return;
                                final r = await runAction(context, () => api.post('/admin/users/${u['id']}/reset-password'));
                                if (r != null) await _showCredential(name, u['email'] as String, r['tempPassword'] as String, false);
                              } else {
                                final deactivate = a == 'deactivate';
                                if (deactivate && !await confirm(context, title: 'Deactivate $name?', message: "They'll be signed out immediately and won't be able to sign in.", ok: 'Deactivate', danger: true)) return;
                                if (!context.mounted) return;
                                await runAction(context, () => api.patch('/admin/users/${u['id']}', {'active': !deactivate}), success: deactivate ? 'Deactivated' : 'Reactivated');
                                _refresh();
                              }
                            },
                            itemBuilder: (_) => [
                              if (active) const PopupMenuItem(value: 'reset', child: Text('Reset password')),
                              PopupMenuItem(value: active ? 'deactivate' : 'reactivate', child: Text(active ? 'Deactivate' : 'Reactivate')),
                            ],
                          ),
                        ]),
                    ]),
                  );
                },
              ),
            ),
          ),
        ),
      ]),
      Positioned(right: 16, bottom: 16, child: FloatingActionButton.extended(onPressed: _roles.isEmpty ? null : _add, icon: const Icon(Icons.person_add_alt), label: const Text('Add person'))),
    ]);
  }
}

class _AddPersonSheet extends StatefulWidget {
  const _AddPersonSheet({required this.roles});
  final List<Json> roles;
  @override
  State<_AddPersonSheet> createState() => _AddPersonSheetState();
}

class _AddPersonSheetState extends State<_AddPersonSheet> {
  final _first = TextEditingController(), _last = TextEditingController(), _email = TextEditingController(), _phone = TextEditingController();
  String _role = 'PHARMACIST';
  Map<String, String> _fields = {};
  String? _error;
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final staffRoles = widget.roles.where((r) => r['role'] != 'CUSTOMER').toList();
    final chosen = widget.roles.where((r) => r['role'] == _role).firstOrNull;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, MediaQuery.viewInsetsOf(context).bottom + 20),
      child: SingleChildScrollView(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('Add a team member', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 10), child: AlertBox(tone: AlertTone.error, message: _error)),
          Row(children: [
            Expanded(child: TextField(controller: _first, decoration: InputDecoration(labelText: 'First name', errorText: _fields['firstName']))),
            const SizedBox(width: 10),
            Expanded(child: TextField(controller: _last, decoration: InputDecoration(labelText: 'Last name', errorText: _fields['lastName']))),
          ]),
          const SizedBox(height: 10),
          TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: InputDecoration(labelText: 'Work email', errorText: _fields['email'])),
          const SizedBox(height: 10),
          TextField(controller: _phone, keyboardType: TextInputType.phone, decoration: InputDecoration(labelText: 'Mobile number', hintText: '0803 123 4567', errorText: _fields['phone'])),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            initialValue: _role,
            decoration: InputDecoration(labelText: 'Role', helperText: chosen?['description'] as String?, helperMaxLines: 3),
            items: [for (final r in staffRoles) DropdownMenuItem(value: r['role'] as String, child: Text(r['label'] as String))],
            onChanged: (v) => setState(() => _role = v!),
          ),
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: _busy
                ? null
                : () async {
                    setState(() {
                      _busy = true;
                      _error = null;
                      _fields = {};
                    });
                    try {
                      final res = await api.post('/admin/users', {'firstName': _first.text.trim(), 'lastName': _last.text.trim(), 'email': _email.text.trim(), 'phone': _phone.text.trim(), 'role': _role});
                      if (context.mounted) Navigator.pop(context, {'name': '${_first.text.trim()} ${_last.text.trim()}', 'email': _email.text.trim(), 'password': res['tempPassword']});
                    } on ApiException catch (e) {
                      setState(() {
                        _error = e.message;
                        _fields = e.fields;
                      });
                    } finally {
                      if (mounted) setState(() => _busy = false);
                    }
                  },
            icon: const Icon(Icons.person_add_alt),
            label: const Text('Create account'),
          ),
          const SizedBox(height: 8),
          const Text('A one-time password is generated for you to hand over in person. They must choose their own password at first sign-in.', style: TextStyle(fontSize: 12, color: AppColors.inkMuted)),
        ]),
      ),
    );
  }
}

class _Roles extends StatelessWidget {
  const _Roles();
  @override
  Widget build(BuildContext context) => Loader(
        load: () async => ((await api.get('/admin/roles'))['roles'] as List).cast<Json>(),
        builder: (context, roles, _) => ListView(padding: const EdgeInsets.all(16), children: [
          for (final r in roles)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: CardBox(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [RolePill(r['role'] as String), const Spacer(), Text('${r['activeUsers']} active', style: const TextStyle(fontSize: 12, color: AppColors.inkMuted))]),
                  const SizedBox(height: 6),
                  Text(r['description'] as String, style: const TextStyle(color: AppColors.inkSoft)),
                  const SizedBox(height: 8),
                  Wrap(spacing: 6, runSpacing: 6, children: [
                    for (final p in (r['permissions'] as List).cast<String>()) Pill(_permissionLabels[p] ?? p, bg: AppColors.care50, fg: AppColors.care700, icon: Icons.check),
                    if ((r['permissions'] as List).isEmpty) const Text('Shop and own account only', style: TextStyle(fontSize: 12.5, color: AppColors.inkMuted)),
                  ]),
                ]),
              ),
            ),
          const Text('Permissions are enforced by the server for every request, not just hidden in the menu.', style: TextStyle(fontSize: 12, color: AppColors.inkMuted)),
        ]),
      );
}

class _Activity extends StatelessWidget {
  const _Activity();
  @override
  Widget build(BuildContext context) => Loader(
        load: () async => ((await api.get('/admin/audit'))['entries'] as List).cast<Json>(),
        builder: (context, entries, reload) => entries.isEmpty
            ? const Center(child: EmptyState(icon: Icons.history, title: 'No staff changes recorded yet'))
            : RefreshIndicator(
                onRefresh: reload,
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: entries.length,
                  separatorBuilder: (_, _) => const Divider(),
                  itemBuilder: (_, i) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(entries[i]['summary'] as String, style: const TextStyle(fontWeight: FontWeight.w500)),
                    subtitle: Text('by ${entries[i]['actorName']} · ${fmtDateTime(entries[i]['createdAt'] as String)}'),
                  ),
                ),
              ),
      );
}
