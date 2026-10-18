import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../state/store_state.dart';
import '../../widgets/common.dart';
import '../../widgets/product_widgets.dart';

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
      final res = await api.get('/products', query: {
        'q': _search.text.trim(),
        'category': _filters.category,
        'rx': _filters.rx,
        'inStock': _filters.inStock ? 'true' : null,
        'sort': _filters.sort == 'relevance' ? null : _filters.sort,
        'minPrice': price?[0],
        'maxPrice': price != null && price.length > 1 ? price[1] : null,
        'page': _page,
        'pageSize': 24,
      });
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
                child: ChoiceChip(label: Text(label), selected: selected, onSelected: (_) => setSheet(onTap), selectedColor: AppColors.brand100),
              );
          return DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.75,
            maxChildSize: 0.92,
            builder: (c, scroll) => ListView(controller: scroll, padding: const EdgeInsets.fromLTRB(20, 0, 20, 24), children: [
              Text('Filters', style: Theme.of(c).textTheme.titleLarge),
              const SizedBox(height: 16),
              const Text('Category', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Wrap(children: [
                chip('All', _filters.category == null, () => _filters.category = null),
                for (final cat in cats) chip(cat.name, _filters.category == cat.slug, () => _filters.category = cat.slug),
              ]),
              const SizedBox(height: 12),
              const Text('Prescription', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Wrap(children: [
                chip('Any', _filters.rx == null, () => _filters.rx = null),
                chip('No prescription needed', _filters.rx == 'OTC', () => _filters.rx = 'OTC'),
                chip('Prescription only', _filters.rx == 'POM', () => _filters.rx = 'POM'),
                chip('Controlled', _filters.rx == 'CONTROLLED', () => _filters.rx = 'CONTROLLED'),
              ]),
              const SizedBox(height: 12),
              const Text('Price', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Wrap(children: [
                chip('Any price', _filters.price == null, () => _filters.price = null),
                for (final b in _priceBands) chip(b.$2, _filters.price == b.$1, () => _filters.price = b.$1),
              ]),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('In stock only', style: TextStyle(fontWeight: FontWeight.w700)),
                value: _filters.inStock,
                onChanged: (v) => setSheet(() => _filters.inStock = v),
              ),
              const SizedBox(height: 12),
              FilledButton(onPressed: () => Navigator.pop(c), child: const Text('Show results')),
            ]),
          );
        },
      ),
    );
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    final store = context.watch<StoreState>();
    final category = _filters.category == null ? null : store.category(_filters.category!);
    final title = category?.name ?? (widget.query?.isNotEmpty == true ? 'Search' : 'Shop');
    return Scaffold(
      appBar: AppBar(title: Text(title), automaticallyImplyLeading: widget.standalone),
      body: RefreshIndicator(
        onRefresh: _reload,
        child: CustomScrollView(controller: _scroll, slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                TextField(
                  controller: _search,
                  textInputAction: TextInputAction.search,
                  onChanged: _onSearch,
                  onSubmitted: (_) => _reload(),
                  decoration: InputDecoration(
                    hintText: 'Search by brand or generic name',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _search.text.isEmpty ? null : IconButton(icon: const Icon(Icons.close), onPressed: () { _search.clear(); _reload(); }),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(99)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(99), borderSide: const BorderSide(color: AppColors.border)),
                  ),
                ),
                if (category != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(category.description, style: const TextStyle(color: AppColors.inkMuted))),
                const SizedBox(height: 10),
                Row(children: [
                  Text('$_total products', style: const TextStyle(color: AppColors.inkMuted)),
                  const Spacer(),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(minimumSize: const Size(10, 38)),
                    onPressed: _openFilters,
                    icon: const Icon(Icons.tune, size: 18),
                    label: Text(_filters.active > 0 || _filters.category != null ? 'Filters (${_filters.active + (_filters.category != null ? 1 : 0)})' : 'Filters'),
                  ),
                  const SizedBox(width: 8),
                  PopupMenuButton<String>(
                    initialValue: _filters.sort,
                    onSelected: (v) {
                      _filters.sort = v;
                      _reload();
                    },
                    itemBuilder: (_) => [for (final s in _sorts) PopupMenuItem(value: s.$1, child: Text(s.$2))],
                    child: const Chip(avatar: Icon(Icons.sort, size: 18), label: Text('Sort')),
                  ),
                ]),
              ]),
            ),
          ),
          if (_error != null && _products.isEmpty)
            SliverFillRemaining(child: ErrorRetry(error: _error!, onRetry: _reload))
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
            SliverPadding(padding: const EdgeInsets.fromLTRB(16, 8, 16, 16), sliver: ProductSliverGrid(_products)),
          if (_loading) const SliverToBoxAdapter(child: Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))),
        ]),
      ),
    );
  }
}
