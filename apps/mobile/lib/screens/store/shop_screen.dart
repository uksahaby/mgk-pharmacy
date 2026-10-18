import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../state/store_state.dart';
import '../../widgets/common.dart';
import '../../widgets/product_widgets.dart';
import '../../widgets/ui.dart';

class _Filters {
  String? category;
  String? rx;
  String? price;
  bool inStock = false;
  String sort = 'relevance';
  int get active => [rx, price].where((v) => v != null).length + (inStock ? 1 : 0);
}

const _priceBands = [('0-2000', 'Under ₦2,000'), ('2000-5000', '₦2,000 – ₦5,000'), ('5000-15000', '₦5,000 – ₦15,000'), ('15000-', 'Over ₦15,000')];
const _sorts = [('relevance', 'Recommended'), ('popular', 'Most popular'), ('price-asc', 'Price: low to high'), ('price-desc', 'Price: high to low'), ('name', 'Name: A–Z'), ('newest', 'Newest')];

/// Catalogue with search, filters, sorting and infinite scroll. Used for the Shop tab, categories and search.
class ShopScreen extends StatefulWidget {
  const ShopScreen({super.key, this.query, this.category, this.standalone = false});
  final String? query;
  final String? category;
  final bool standalone;
  @override
  State<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends State<ShopScreen> {
  final _filters = _Filters();
  late final _search = TextEditingController(text: widget.query ?? '');
  final _scroll = ScrollController();
  final List<Product> _products = [];
  int _page = 1, _pageCount = 1, _total = 0;
  bool _loading = false;
  Object? _error;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _filters.category = widget.category;
    _scroll.addListener(() {
      if (_scroll.position.pixels > _scroll.position.maxScrollExtent - 600) _loadMore();
    });
    _reload();
  }

  @override
  void dispose() {
    _scroll.dispose();
    _search.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _reload() async {
    _products.clear();
    _page = 1;
    _pageCount = 1;
    await _fetch();
  }

  Future<void> _loadMore() async {
    if (_loading || _page >= _pageCount) return;
    _page++;
    await _fetch();
  }

  Future<void> _fetch() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final price = _filters.price?.split('-');
      final res = await api.get(
        '/products',
        query: {
          'q': _search.text.trim(),
          'category': _filters.category,
          'rx': _filters.rx,
          'inStock': _filters.inStock ? 'true' : null,
          'sort': _filters.sort == 'relevance' ? null : _filters.sort,
          'minPrice': price?[0],
          'maxPrice': price != null && price.length > 1 ? price[1] : null,
          'page': _page,
          'pageSize': 24,
        },
      );
      setState(() {
        _products.addAll((res['products'] as List).map((p) => Product(p as Json)));
        _pageCount = (res['pageCount'] as num).toInt();
        _total = (res['total'] as num).toInt();
      });
    } catch (e) {
      setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onSearch(String _) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), _reload);
  }

  Future<void> _openFilters() async {
    final cats = context.read<StoreState>().categories;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (c) => StatefulBuilder(
        builder: (c, setSheet) {
          Widget chip(String label, bool selected, VoidCallback onTap) => Padding(
            padding: const EdgeInsets.only(right: 8, bottom: 8),
            child: ChoiceChip(
              label: Text(label),
              selected: selected,
              onSelected: (_) => setSheet(onTap),
              showCheckmark: false,
              selectedColor: AppColors.brand600,
              labelStyle: TextStyle(color: selected ? Colors.white : AppColors.inkSoft, fontWeight: FontWeight.w600),
              backgroundColor: AppColors.slate100,
            ),
          );
          return DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.75,
            maxChildSize: 0.92,
            builder: (c, scroll) => ListView(
              controller: scroll,
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
              children: [
                Text('Filters', style: Theme.of(c).textTheme.titleLarge),
                const SizedBox(height: 16),
                const Text('Category', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Wrap(
                  children: [
                    chip('All', _filters.category == null, () => _filters.category = null),
                    for (final cat in cats) chip(cat.name, _filters.category == cat.slug, () => _filters.category = cat.slug),
                  ],
                ),
                const SizedBox(height: 12),
                const Text('Prescription', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Wrap(
                  children: [
                    chip('Any', _filters.rx == null, () => _filters.rx = null),
                    chip('No prescription needed', _filters.rx == 'OTC', () => _filters.rx = 'OTC'),
                    chip('Prescription only', _filters.rx == 'POM', () => _filters.rx = 'POM'),
                    chip('Controlled', _filters.rx == 'CONTROLLED', () => _filters.rx = 'CONTROLLED'),
                  ],
                ),
                const SizedBox(height: 12),
                const Text('Price', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Wrap(children: [chip('Any price', _filters.price == null, () => _filters.price = null), for (final b in _priceBands) chip(b.$2, _filters.price == b.$1, () => _filters.price = b.$1)]),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('In stock only', style: TextStyle(fontWeight: FontWeight.w700)),
                  value: _filters.inStock,
                  onChanged: (v) => setSheet(() => _filters.inStock = v),
                ),
                const SizedBox(height: 12),
                FilledButton(onPressed: () => Navigator.pop(c), child: const Text('Show results')),
              ],
            ),
          );
        },
      ),
    );
    _reload();
  }

  Future<void> _openSort() async {
    final picked = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      backgroundColor: Colors.white,
      builder: (c) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text('Sort by', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
            ),
            RadioGroup<String>(
              groupValue: _filters.sort,
              onChanged: (v) => Navigator.pop(c, v),
              child: Column(
                children: [for (final s in _sorts) RadioListTile<String>(value: s.$1, title: Text(s.$2))],
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (picked != null && picked != _filters.sort) {
      _filters.sort = picked;
      _reload();
    }
  }

  void _pickCategory(String? slug) {
    if (slug == _filters.category) return;
    setState(() => _filters.category = slug);
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    final store = context.watch<StoreState>();
    final category = _filters.category == null ? null : store.category(_filters.category!);
    final title = category?.name ?? (widget.query?.isNotEmpty == true ? 'Search' : 'Shop Medicines');
    final cats = store.categories;
    final catIndex = _filters.category == null ? 0 : cats.indexWhere((c) => c.slug == _filters.category) + 1;
    final filterCount = _filters.active;
    final sortLabel = _sorts.firstWhere((s) => s.$1 == _filters.sort).$2;
    return Scaffold(
      appBar: AppBar(title: Text(title), centerTitle: true, automaticallyImplyLeading: widget.standalone, actions: const [CartButton(), SizedBox(width: 4)]),
      body: RefreshIndicator(
        onRefresh: _reload,
        child: CustomScrollView(
          controller: _scroll,
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextField(
                      controller: _search,
                      textInputAction: TextInputAction.search,
                      onChanged: _onSearch,
                      onSubmitted: (_) => _reload(),
                      decoration: InputDecoration(
                        hintText: 'Search medicines & health products',
                        prefixIcon: const Icon(Icons.search_rounded, color: AppColors.hint),
                        fillColor: AppColors.slate50,
                        contentPadding: const EdgeInsets.symmetric(vertical: 12),
                        suffixIcon: _search.text.isEmpty
                            ? null
                            : IconButton(
                                icon: const Icon(Icons.close_rounded),
                                onPressed: () {
                                  _search.clear();
                                  _reload();
                                },
                              ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(minimumSize: const Size(0, 42)),
                            onPressed: _openFilters,
                            icon: const Icon(Icons.tune_rounded, size: 18),
                            label: Text(filterCount > 0 ? 'Filter ($filterCount)' : 'Filter'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(minimumSize: const Size(0, 42)),
                            onPressed: _openSort,
                            icon: const Icon(Icons.swap_vert_rounded, size: 18),
                            label: Text(_filters.sort == 'relevance' ? 'Sort' : sortLabel, overflow: TextOverflow.ellipsis),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            if (cats.isNotEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(top: 12, bottom: 4),
                  child: ChipTabs(labels: ['All', for (final c in cats) c.name], index: catIndex < 0 ? 0 : catIndex, onChanged: (i) => _pickCategory(i == 0 ? null : cats[i - 1].slug)),
                ),
              ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: Text(_loading && _products.isEmpty ? 'Searching…' : '$_total products', style: const TextStyle(color: AppColors.inkMuted, fontSize: 12.5)),
              ),
            ),
            if (_error != null && _products.isEmpty)
              SliverFillRemaining(
                child: ErrorRetry(error: _error!, onRetry: _reload),
              )
            else if (!_loading && _products.isEmpty)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: EmptyState(
                  icon: Icons.manage_search,
                  title: 'No products match your search',
                  message: 'Try a generic name (for example “paracetamol”), remove a filter, or ask a pharmacist on WhatsApp.',
                ),
              )
            else
              SliverList.separated(
                itemCount: _products.length,
                separatorBuilder: (_, _) => const Divider(height: 1, indent: 16, endIndent: 16, color: AppColors.line),
                itemBuilder: (_, i) => ProductListTile(_products[i]),
              ),
            if (_loading)
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: CircularProgressIndicator()),
                ),
              ),
            const SliverToBoxAdapter(child: SizedBox(height: 16)),
          ],
        ),
      ),
    );
  }
}
