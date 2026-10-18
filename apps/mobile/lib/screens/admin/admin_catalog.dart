import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../state/store_state.dart';
import '../../widgets/common.dart';
import 'admin_home.dart';

class AdminProductsScreen extends StatefulWidget {
  const AdminProductsScreen({super.key, this.stock, this.category});
  final String? stock, category;
  @override
  State<AdminProductsScreen> createState() => _AdminProductsScreenState();
}

class _AdminProductsScreenState extends State<AdminProductsScreen> {
  final _q = TextEditingController();
  late String? _category = widget.category, _stock = widget.stock;
  String? _rx;
  int _page = 1;
  Key _key = UniqueKey();
  void _apply() => setState(() {
        _page = 1;
        _key = UniqueKey();
      });

  @override
  Widget build(BuildContext context) {
    final cats = context.watch<StoreState>().categories;
    final other = cats.where((c) => c.slug == 'other').firstOrNull;
    return AdminScaffold(
      title: 'Products',
      permission: 'products.manage',
      fab: FloatingActionButton.extended(onPressed: () => context.push('/admin/products/new'), icon: const Icon(Icons.add), label: const Text('New product')),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: TextField(controller: _q, textInputAction: TextInputAction.search, onSubmitted: (_) => _apply(), decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Name, generic or brand')),
        ),
        SizedBox(
          height: 52,
          child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.fromLTRB(16, 8, 16, 4), children: [
            _Dropdown<String?>(
              value: _category,
              label: 'Category',
              items: [const DropdownMenuItem(value: null, child: Text('All categories')), for (final c in cats) DropdownMenuItem(value: c.slug, child: Text('${c.name} (${c.productCount})'))],
              onChanged: (v) {
                _category = v;
                _apply();
              },
            ),
            const SizedBox(width: 8),
            _Dropdown<String?>(
              value: _rx,
              label: 'Class',
              items: const [DropdownMenuItem(value: null, child: Text('Any class')), DropdownMenuItem(value: 'OTC', child: Text('OTC')), DropdownMenuItem(value: 'POM', child: Text('Prescription only')), DropdownMenuItem(value: 'CONTROLLED', child: Text('Controlled'))],
              onChanged: (v) {
                _rx = v;
                _apply();
              },
            ),
            const SizedBox(width: 8),
            FilterChip(label: const Text('Never stocked'), selected: _stock == 'never', onSelected: (s) {
              _stock = s ? 'never' : null;
              _apply();
            }),
          ]),
        ),
        if (other != null && other.productCount > 0 && _category != 'other')
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 6, 16, 0),
            child: InkWell(
              onTap: () {
                _category = 'other';
                _apply();
              },
              child: AlertBox(tone: AlertTone.warning, message: '${other.productCount} imported products still need a category. Most were defaulted to prescription-only for safety. Tap to review.'),
            ),
          ),
        Expanded(
          child: Loader(
            key: _key,
            load: () => api.get('/admin/products', query: {'q': _q.text.trim(), 'category': _category, 'rx': _rx, 'stock': _stock, 'page': _page}),
            builder: (context, data, reload) {
              final list = (data['products'] as List).cast<Json>();
              final pageCount = (data['pageCount'] as num).toInt();
              return RefreshIndicator(
                onRefresh: reload,
                child: ListView(padding: const EdgeInsets.fromLTRB(16, 10, 16, 100), children: [
                  Text('${data['total']} products', style: const TextStyle(color: AppColors.inkMuted)),
                  const SizedBox(height: 8),
                  for (final j in list)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: CardBox(
                        padding: const EdgeInsets.all(12),
                        onTap: () async {
                          await context.push('/admin/products/${j['id']}');
                          setState(() => _key = UniqueKey());
                        },
                        child: Row(children: [
                          Expanded(
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text('${j['name']} ${j['strength'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w700)),
                              Text('${j['genericName']} · ${j['packSize']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: AppColors.inkMuted)),
                              const SizedBox(height: 4),
                              Wrap(spacing: 6, children: [
                                j['rxStatus'] == 'OTC' ? const Pill('OTC', bg: AppColors.slate100, fg: AppColors.inkSoft) : RxBadge(j['rxStatus'] as String),
                                Pill(Product(j).categoryName, bg: AppColors.slate100, fg: AppColors.inkSoft),
                                if (j['active'] != true) const Pill('Hidden', bg: Color(0xFFE2E8F0), fg: AppColors.inkSoft),
                              ]),
                            ]),
                          ),
                          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                            Text(naira(j['priceKobo'] as num), style: const TextStyle(fontWeight: FontWeight.w800)),
                            Text('${j['stock']} in stock', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: (j['stock'] as num) == 0 ? AppColors.brand700 : (j['stock'] as num) <= 10 ? AppColors.orange800 : AppColors.inkMuted)),
                          ]),
                        ]),
                      ),
                    ),
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
}

class _Dropdown<T> extends StatelessWidget {
  const _Dropdown({required this.value, required this.label, required this.items, required this.onChanged});
  final T value;
  final String label;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T> onChanged;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(99), border: Border.all(color: AppColors.border)),
        child: DropdownButton<T>(value: value, items: items, onChanged: (v) => onChanged(v as T), underline: const SizedBox.shrink(), hint: Text(label)),
      );
}

class AdminProductEditScreen extends StatelessWidget {
  const AdminProductEditScreen({super.key, this.id});
  final String? id;

  @override
  Widget build(BuildContext context) => AdminScaffold(
        title: id == null ? 'New product' : 'Edit product',
        permission: 'products.manage',
        body: id == null
            ? const _ProductForm(product: null)
            : Loader(
                load: () async => (await api.get('/admin/products/$id'))['product'] as Json,
                builder: (context, p, reload) => _ProductForm(product: p, reload: reload),
              ),
      );
}

class _ProductForm extends StatefulWidget {
  const _ProductForm({required this.product, this.reload});
  final Json? product;
  final Future<void> Function()? reload;
  @override
  State<_ProductForm> createState() => _ProductFormState();
}

class _ProductFormState extends State<_ProductForm> {
  late final p = widget.product;
  late final _c = {
    for (final k in ['name', 'genericName', 'brand', 'manufacturer', 'strength', 'dosageForm', 'packSize', 'description', 'usage', 'warnings', 'storage']) k: TextEditingController(text: '${p?[k] ?? (k == 'dosageForm' ? 'Tablet' : '')}'),
    'price': TextEditingController(text: p == null ? '' : '${(p!['priceKobo'] as num) / 100}'),
    'compareAt': TextEditingController(text: p?['compareAtKobo'] == null ? '' : '${(p!['compareAtKobo'] as num) / 100}'),
  };
  late String? _category = (p?['category'] as Json?)?['slug'] as String?;
  late String _rx = p?['rxStatus'] as String? ?? 'OTC';
  late bool _cold = p?['coldChain'] == true, _featured = p?['featured'] == true, _active = p?['active'] != false;
  final _batchNo = TextEditingController(), _batchQty = TextEditingController();
  DateTime? _batchExpiry;
  Map<String, String> _fields = {};
  bool _busy = false;

  Future<void> _save() async {
    setState(() {
      _busy = true;
      _fields = {};
    });
    final body = {
      for (final k in ['name', 'genericName', 'brand', 'dosageForm', 'packSize', 'description', 'usage', 'warnings']) k: _c[k]!.text.trim(),
      'manufacturer': _c['manufacturer']!.text.trim().isEmpty ? null : _c['manufacturer']!.text.trim(),
      'strength': _c['strength']!.text.trim().isEmpty ? null : _c['strength']!.text.trim(),
      if (_c['storage']!.text.trim().isNotEmpty) 'storage': _c['storage']!.text.trim(),
      'priceKobo': ((double.tryParse(_c['price']!.text) ?? 0) * 100).round(),
      'compareAtKobo': _c['compareAt']!.text.trim().isEmpty ? null : ((double.tryParse(_c['compareAt']!.text) ?? 0) * 100).round(),
      'categorySlug': _category,
      'rxStatus': _rx,
      'coldChain': _cold,
      'featured': _featured,
      'active': _active,
    };
    try {
      if (p == null) {
        final res = await api.post('/admin/products', body);
        if (mounted) {
          snack(context, 'Product created. Now receive stock for it.');
          context.pushReplacement('/admin/products/${(res['product'] as Json)['id']}');
        }
      } else {
        await api.put('/admin/products/${p!['id']}', body);
        if (mounted) snack(context, 'Saved');
        await widget.reload?.call();
      }
    } on ApiException catch (e) {
      setState(() => _fields = e.fields);
      if (mounted) snack(context, e.message, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cats = context.watch<StoreState>().categories;
    final batches = (p?['batches'] as List? ?? const []).cast<Json>();
    InputDecoration d(String label, String field, {String? hint}) => InputDecoration(labelText: label, helperText: hint, errorText: _fields[field]);
    return ListView(padding: const EdgeInsets.all(16), children: [
      if (p != null) ...[
        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              const Expanded(child: Text('Stock batches', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16))),
              Text('${p!['stock']} sellable', style: const TextStyle(color: AppColors.inkMuted)),
            ]),
            const Text('Orders draw from the earliest-expiring batch first. Quarantined or recalled batches are never sold.', style: TextStyle(fontSize: 12, color: AppColors.inkMuted)),
            const SizedBox(height: 8),
            for (final b in batches)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(b['batchNumber'] as String, style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.w700)),
                      Text('Expires ${fmtDate(b['expiresAt'] as String)} · ${b['quantity']} units', style: TextStyle(fontSize: 12, color: DateTime.parse(b['expiresAt'] as String).isBefore(DateTime.now().add(const Duration(days: 90))) ? AppColors.orange800 : AppColors.inkMuted)),
                    ]),
                  ),
                  DropdownButton<String>(
                    value: b['status'] as String,
                    underline: const SizedBox.shrink(),
                    items: const [DropdownMenuItem(value: 'ACTIVE', child: Text('Active')), DropdownMenuItem(value: 'QUARANTINED', child: Text('Quarantined')), DropdownMenuItem(value: 'RECALLED', child: Text('Recalled'))],
                    onChanged: (v) async {
                      if (await runAction(context, () => api.post('/admin/batches/${b['id']}/status', {'status': v}), success: 'Batch updated') != null) await widget.reload?.call();
                    },
                  ),
                ]),
              ),
            const Divider(height: 20),
            const Text('Receive stock', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: TextField(controller: _batchNo, decoration: const InputDecoration(labelText: 'Batch no.'))),
              const SizedBox(width: 8),
              SizedBox(width: 90, child: TextField(controller: _batchQty, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Qty'))),
            ]),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () async {
                final d = await showDatePicker(context: context, firstDate: DateTime.now().add(const Duration(days: 30)), lastDate: DateTime.now().add(const Duration(days: 3650)), initialDate: DateTime.now().add(const Duration(days: 365)), helpText: 'Expiry date');
                if (d != null) setState(() => _batchExpiry = d);
              },
              icon: const Icon(Icons.event_outlined),
              label: Text(_batchExpiry == null ? 'Choose expiry date' : 'Expires ${fmtDate(_batchExpiry!.toIso8601String())}'),
            ),
            const SizedBox(height: 8),
            FilledButton.icon(
              style: FilledButton.styleFrom(backgroundColor: AppColors.ink),
              onPressed: () async {
                if (_batchExpiry == null) return snack(context, 'Choose an expiry date', error: true);
                final ok = await runAction(context, () => api.post('/admin/products/${p!['id']}/batches', {'batchNumber': _batchNo.text.trim(), 'quantity': _batchQty.text.trim(), 'expiresAt': _batchExpiry!.toIso8601String()}), success: 'Stock received');
                if (ok != null) {
                  _batchNo.clear();
                  _batchQty.clear();
                  setState(() => _batchExpiry = null);
                  await widget.reload?.call();
                }
              },
              icon: const Icon(Icons.add),
              label: const Text('Receive stock'),
            ),
          ]),
        ),
        const SizedBox(height: 12),
      ],
      CardBox(
        child: Column(children: [
          TextField(controller: _c['name'], decoration: d('Product name', 'name')),
          const SizedBox(height: 10),
          TextField(controller: _c['genericName'], decoration: d('Generic name / active ingredient', 'genericName', hint: 'Customers search by this.')),
          const SizedBox(height: 10),
          TextField(controller: _c['brand'], decoration: d('Brand', 'brand')),
          const SizedBox(height: 10),
          TextField(controller: _c['manufacturer'], decoration: d('Manufacturer (optional)', 'manufacturer')),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: TextField(controller: _c['strength'], decoration: d('Strength', 'strength'))),
            const SizedBox(width: 10),
            Expanded(child: TextField(controller: _c['dosageForm'], decoration: d('Dosage form', 'dosageForm'))),
          ]),
          const SizedBox(height: 10),
          TextField(controller: _c['packSize'], decoration: d('Pack size', 'packSize', hint: 'Always state the unit, e.g. Pack of 30 tablets.')),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            initialValue: _category,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Category'),
            items: [for (final c in cats) DropdownMenuItem(value: c.slug, child: Text(c.name))],
            onChanged: (v) => setState(() => _category = v),
          ),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: TextField(controller: _c['price'], keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: d('Price (₦)', 'priceKobo'))),
            const SizedBox(width: 10),
            Expanded(child: TextField(controller: _c['compareAt'], keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: d('Was price (₦)', 'compareAtKobo'))),
          ]),
        ]),
      ),
      const SizedBox(height: 12),
      CardBox(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          DropdownButtonFormField<String>(
            initialValue: _rx,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Dispensing class', helperText: 'Antibiotics, BP and diabetes medicines must be POM. Opioids and benzodiazepines must be Controlled.', helperMaxLines: 3),
            items: const [DropdownMenuItem(value: 'OTC', child: Text('OTC: no prescription needed')), DropdownMenuItem(value: 'POM', child: Text('POM: prescription only')), DropdownMenuItem(value: 'CONTROLLED', child: Text('Controlled: prescription + verified ID'))],
            onChanged: (v) => setState(() => _rx = v!),
          ),
          SwitchListTile(contentPadding: EdgeInsets.zero, value: _cold, onChanged: (v) => setState(() => _cold = v), title: const Text('Cold chain (2–8°C)')),
          SwitchListTile(contentPadding: EdgeInsets.zero, value: _featured, onChanged: (v) => setState(() => _featured = v), title: const Text('Featured on homepage')),
          SwitchListTile(contentPadding: EdgeInsets.zero, value: _active, onChanged: (v) => setState(() => _active = v), title: const Text('Visible in store')),
        ]),
      ),
      const SizedBox(height: 12),
      CardBox(
        child: Column(children: [
          TextField(controller: _c['description'], maxLines: 4, decoration: d('Description', 'description')),
          const SizedBox(height: 10),
          TextField(controller: _c['usage'], maxLines: 3, decoration: d('How to use', 'usage')),
          const SizedBox(height: 10),
          TextField(controller: _c['warnings'], maxLines: 3, decoration: d('Warnings & side effects', 'warnings')),
          const SizedBox(height: 10),
          TextField(controller: _c['storage'], maxLines: 2, decoration: d('Storage (optional)', 'storage')),
        ]),
      ),
      const SizedBox(height: 12),
      FilledButton(onPressed: _busy ? null : _save, child: Text(p == null ? 'Create product' : 'Save changes')),
      const SizedBox(height: 24),
    ]);
  }
}

class AdminInventoryScreen extends StatelessWidget {
  const AdminInventoryScreen({super.key});
  @override
  Widget build(BuildContext context) => AdminScaffold(
        title: 'Inventory',
        permission: 'inventory.manage',
        body: Loader(
          load: () => api.get('/admin/inventory'),
          builder: (context, data, reload) {
            final low = (data['lowStock'] as List).cast<Json>();
            final expiring = (data['expiring'] as List).cast<Json>();
            final never = (data['neverStocked'] as num).toInt();
            return RefreshIndicator(
              onRefresh: reload,
              child: ListView(padding: const EdgeInsets.all(16), children: [
                if (never > 0)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: CardBox(onTap: () => context.push('/admin/products?stock=never'), child: Text('$never products are listed but have never been stocked. They aren\'t counted as low stock. Tap to review.')),
                  ),
                SectionTitle('Running low (${low.length})'),
                Text('Stocked products with ${data['threshold']} or fewer sellable units, fastest sellers first.', style: const TextStyle(fontSize: 12.5, color: AppColors.inkMuted)),
                const SizedBox(height: 8),
                if (low.isEmpty) const Text('Everything is well stocked.', style: TextStyle(color: AppColors.inkMuted)),
                for (final p in low)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    onTap: () => context.push('/admin/products/${p['id']}'),
                    title: Text(p['name'] as String, style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text('${p['packSize']} · ${p['soldCount']} sold'),
                    trailing: Text((p['stock'] as num) == 0 ? 'Out' : '${p['stock']}', style: TextStyle(fontWeight: FontWeight.w800, color: (p['stock'] as num) == 0 ? AppColors.brand700 : AppColors.orange800)),
                  ),
                const SizedBox(height: 16),
                SectionTitle('Expiring within 90 days (${expiring.length})'),
                if (expiring.isEmpty) const Text('No batches expiring soon.', style: TextStyle(color: AppColors.inkMuted)),
                for (final b in expiring)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    onTap: () => context.push('/admin/products/${b['productId']}'),
                    title: Text(b['productName'] as String, style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text('Batch ${b['batchNumber']} · ${b['quantity']} units'),
                    trailing: Text(b['expired'] == true ? 'Expired' : fmtDate(b['expiresAt'] as String), style: TextStyle(fontWeight: FontWeight.w700, color: b['expired'] == true ? AppColors.brand700 : AppColors.orange800)),
                  ),
              ]),
            );
          },
        ),
      );
}
