import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/api.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';
import '../../state/auth_state.dart';
import '../../state/store_state.dart';
import '../../widgets/common.dart';
import '../../widgets/product_widgets.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  Future<(List<Product>, List<Product>)> _load() async {
    final r = await Future.wait([
      api.get('/products', query: {'featured': 'true', 'pageSize': 8}),
      api.get('/products', query: {'category': 'malaria', 'pageSize': 6, 'inStock': 'true'}),
    ]);
    List<Product> ps(Json j) => (j['products'] as List).map((p) => Product(p as Json)).toList();
    return (ps(r[0]), ps(r[1]));
  }

  @override
  Widget build(BuildContext context) {
    final store = context.watch<StoreState>();
    final user = context.watch<AuthState>().user;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: store.load,
          child: CustomScrollView(slivers: [
            SliverToBoxAdapter(child: _Header(userName: user?.firstName, staff: user?.isStaff == true, rider: user?.isRider == true)),
            SliverToBoxAdapter(child: _Hero()),
            const SliverToBoxAdapter(child: _Promises()),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
              sliver: SliverToBoxAdapter(child: SectionTitle('Shop by health need', eyebrow: 'Browse', action: 'View all', onAction: () => context.go('/shop'))),
            ),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: 130, mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 0.9),
                delegate: SliverChildBuilderDelegate((c, i) => _CategoryTile(store.categories[i]), childCount: store.categories.length),
              ),
            ),
            SliverToBoxAdapter(
              child: Loader(
                load: _load,
                builder: (context, data, _) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  if (data.$1.isNotEmpty) ...[
                    Padding(padding: const EdgeInsets.fromLTRB(16, 28, 16, 0), child: SectionTitle('Customer favourites', eyebrow: 'Popular right now', action: 'See more', onAction: () => context.go('/shop'))),
                    ProductRow(data.$1),
                  ],
                  const _PrescriptionBanner(),
                  if (data.$2.isNotEmpty) ...[
                    Padding(padding: const EdgeInsets.fromLTRB(16, 28, 16, 0), child: SectionTitle('Malaria treatment you can trust', eyebrow: 'Rainy-season essentials', action: 'All', onAction: () => context.push('/category/malaria'))),
                    ProductRow(data.$2),
                  ],
                ]),
              ),
            ),
            SliverToBoxAdapter(child: _DeliveryCard(info: store.info)),
            const SliverToBoxAdapter(child: _PharmacistCard()),
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
          ]),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({this.userName, required this.staff, required this.rider});
  final String? userName;
  final bool staff, rider;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Column(children: [
          Row(children: [
            const _Logo(),
            const Spacer(),
            if (staff) TextButton.icon(onPressed: () => context.push('/admin'), icon: const Icon(Icons.dashboard_outlined, size: 18), label: const Text('Dashboard')),
            if (rider && !staff) TextButton.icon(onPressed: () => context.push('/rider'), icon: const Icon(Icons.delivery_dining, size: 18), label: const Text('Rider app')),
            IconButton(onPressed: () => openLink(Site.whatsapp), icon: const Icon(Icons.chat_outlined), tooltip: 'Chat with a pharmacist'),
          ]),
          const SizedBox(height: 10),
          InkWell(
            borderRadius: BorderRadius.circular(99),
            onTap: () => context.go('/shop'),
            child: Container(
              height: 50,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(99), border: Border.all(color: AppColors.border)),
              child: const Row(children: [
                Icon(Icons.search, color: Color(0xFF94A3B8)),
                SizedBox(width: 10),
                Expanded(child: Text('Search Coartem, metformin…', style: TextStyle(color: Color(0xFF94A3B8)))),
              ]),
            ),
          ),
        ]),
      );
}

class _Logo extends StatelessWidget {
  const _Logo();
  @override
  Widget build(BuildContext context) => Row(children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(color: AppColors.brand600, borderRadius: BorderRadius.circular(11)),
          child: const Icon(Icons.add, color: Colors.white, size: 26),
        ),
        const SizedBox(width: 9),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text.rich(TextSpan(children: [
            TextSpan(text: 'MGK', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 19)),
            const TextSpan(text: '.', style: TextStyle(color: AppColors.brand600, fontWeight: FontWeight.w900, fontSize: 19)),
          ])),
          const Text('PHARMACY', style: TextStyle(fontSize: 9, letterSpacing: 2.2, fontWeight: FontWeight.w700, color: AppColors.inkMuted)),
        ]),
      ]);
}

class _Hero extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Colors.white, AppColors.brand50]),
          border: Border.all(color: AppColors.brand100),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Pill('Licensed pharmacy · Kano, Nigeria', bg: AppColors.care50, fg: AppColors.care700, icon: Icons.verified_outlined),
          const SizedBox(height: 14),
          Text.rich(
            TextSpan(children: [
              const TextSpan(text: 'Genuine medicines, '),
              TextSpan(text: 'checked by real pharmacists', style: TextStyle(color: AppColors.brand600.withValues(alpha: 1))),
              const TextSpan(text: ', delivered to your door.'),
            ]),
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(height: 1.15),
          ),
          const SizedBox(height: 10),
          const Text('Shop everyday essentials or upload a prescription. Pharmacist review in about 2 hours, delivery across Nigeria.',
              style: TextStyle(color: AppColors.inkSoft, height: 1.45)),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(child: FilledButton(onPressed: () => context.go('/shop'), child: const Text('Shop now'))),
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => context.push('/account/prescriptions'),
                icon: const Icon(Icons.upload_file, size: 18),
                label: const FittedBox(child: Text('Prescription')),
              ),
            ),
          ]),
        ]),
      );
}

class _Promises extends StatelessWidget {
  const _Promises();
  @override
  Widget build(BuildContext context) {
    const items = [
      (Icons.verified_user_outlined, 'Genuine & NAFDAC-registered'),
      (Icons.medical_services_outlined, 'Pharmacist-reviewed'),
      (Icons.local_shipping_outlined, 'Same-day in Kano'),
      (Icons.lock_outline, 'Secure payments'),
    ];
    return SizedBox(
      height: 64,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
        scrollDirection: Axis.horizontal,
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (_, i) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
          child: Row(children: [
            Icon(items[i].$1, size: 18, color: AppColors.brand600),
            const SizedBox(width: 8),
            Text(items[i].$2, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
          ]),
        ),
      ),
    );
  }
}

class _CategoryTile extends StatelessWidget {
  const _CategoryTile(this.c);
  final Category c;
  @override
  Widget build(BuildContext context) {
    final tone = toneFor(c.icon);
    return CardBox(
      padding: const EdgeInsets.all(10),
      onTap: () => context.push('/category/${c.slug}'),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(color: tone.bg, borderRadius: BorderRadius.circular(11)),
          child: Icon(categoryIcon(c.icon), color: tone.fg, size: 20),
        ),
        const Spacer(),
        Text(c.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12, height: 1.2)),
        Text('${c.productCount}', style: const TextStyle(fontSize: 11, color: AppColors.inkMuted)),
      ]),
    );
  }
}

class _PrescriptionBanner extends StatelessWidget {
  const _PrescriptionBanner();
  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.fromLTRB(16, 28, 16, 0),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(color: AppColors.ink, borderRadius: BorderRadius.circular(24)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('PRESCRIPTIONS MADE SIMPLE', style: TextStyle(color: AppColors.brand200, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.4)),
          const SizedBox(height: 6),
          Text("From your doctor's note to your door, without the queue.", style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white)),
          const SizedBox(height: 14),
          for (final (n, t, d) in const [
            ('01', 'Upload', 'Photo or PDF, at checkout or in your account.'),
            ('02', 'Pharmacist review', 'Usually within 2 working hours.'),
            ('03', 'Pay & receive', 'Pay only after approval. Delivery or pickup.'),
          ])
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(n, style: const TextStyle(color: Colors.white38, fontWeight: FontWeight.w800, fontSize: 18)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(t, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                    Text(d, style: const TextStyle(color: Colors.white60, fontSize: 13)),
                  ]),
                ),
              ]),
            ),
          const SizedBox(height: 6),
          Row(children: [
            Expanded(child: FilledButton(onPressed: () => context.push('/account/prescriptions'), child: const Text('Upload prescription'))),
            const SizedBox(width: 8),
            TextButton(onPressed: () => context.push('/info/prescriptions'), child: const Text('How it works', style: TextStyle(color: Colors.white))),
          ]),
        ]),
      );
}

class _DeliveryCard extends StatelessWidget {
  const _DeliveryCard({this.info});
  final StoreInfo? info;
  @override
  Widget build(BuildContext context) {
    if (info == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 28, 16, 0),
      child: CardBox(
        padding: const EdgeInsets.all(18),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('DELIVERY & PICKUP', style: TextStyle(color: AppColors.brand600, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.4)),
          const SizedBox(height: 4),
          Text('Clear prices, no surprises', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          for (final z in info!.zones)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(z.name, style: const TextStyle(fontWeight: FontWeight.w600)), Text(z.etaLabel, style: const TextStyle(fontSize: 12, color: AppColors.inkMuted))])),
                Text(naira(z.feeKobo), style: const TextStyle(fontWeight: FontWeight.w700)),
              ]),
            ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 6),
            child: Row(children: [
              Expanded(child: Text('Pickup in store, Kano', style: TextStyle(fontWeight: FontWeight.w600))),
              Text('Free', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.care700)),
            ]),
          ),
          const SizedBox(height: 4),
          Text('Free delivery anywhere on orders over ${naira(info!.freeDeliveryThresholdKobo)}', style: const TextStyle(color: AppColors.care700, fontSize: 13)),
        ]),
      ),
    );
  }
}

class _PharmacistCard extends StatelessWidget {
  const _PharmacistCard();
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
        child: CardBox(
          padding: const EdgeInsets.all(18),
          child: Row(children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(color: AppColors.care50, borderRadius: BorderRadius.circular(14)),
              child: const Icon(Icons.chat_outlined, color: AppColors.care600),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Not sure what you need?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                Text('Ask a pharmacist on WhatsApp. It\'s free.', style: TextStyle(color: AppColors.inkMuted, fontSize: 13)),
              ]),
            ),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: AppColors.care600, minimumSize: const Size(10, 42)),
              onPressed: () => openLink(Site.whatsapp),
              child: const Text('Chat'),
            ),
          ]),
        ),
      );
}
