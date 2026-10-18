import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/models.dart';

class CartItem {
  CartItem({required this.productId, required this.quantity, required this.snapshot});
  final String productId;
  int quantity;
  /// Name, price, pack size etc. at the time of adding; the server quote is always authoritative.
  final Json snapshot;

  String get name => snapshot['name'] as String;
  String? get strength => snapshot['strength'] as String?;
  String get packSize => snapshot['packSize'] as String? ?? '';
  int get priceKobo => (snapshot['priceKobo'] as num).toInt();
  String get rxStatus => snapshot['rxStatus'] as String? ?? 'OTC';
  String get icon => snapshot['icon'] as String? ?? 'pill';
  String get slug => snapshot['slug'] as String;

  Json toJson() => {'productId': productId, 'quantity': quantity, 'snapshot': snapshot};
}

/// Cart kept on the device (like the website's localStorage cart) and priced live by the API at checkout.
class CartState extends ChangeNotifier {
  static const _key = 'mgk.cart.v1';
  static const maxQty = 50;
  final List<CartItem> _items = [];
  List<CartItem> get items => List.unmodifiable(_items);
  int get count => _items.fold(0, (s, i) => s + i.quantity);

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) return;
    try {
      for (final e in jsonDecode(raw) as List) {
        final m = e as Json;
        _items.add(CartItem(productId: m['productId'] as String, quantity: (m['quantity'] as num).toInt(), snapshot: m['snapshot'] as Json));
      }
      notifyListeners();
    } catch (_) {
      await prefs.remove(_key);
    }
  }

  Future<void> _save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(_items.map((i) => i.toJson()).toList()));
  }

  static Json snapshotOf(Product p) => {
        'slug': p.slug,
        'name': p.name,
        'strength': p.strength,
        'packSize': p.packSize,
        'priceKobo': p.priceKobo,
        'rxStatus': p.rxStatus,
        'icon': p.icon,
      };

  void add(String productId, Json snapshot, [int quantity = 1]) {
    final existing = _items.where((i) => i.productId == productId).firstOrNull;
    if (existing != null) {
      existing.quantity = (existing.quantity + quantity).clamp(1, maxQty);
    } else {
      _items.add(CartItem(productId: productId, quantity: quantity.clamp(1, maxQty), snapshot: snapshot));
    }
    _save();
    notifyListeners();
  }

  void setQuantity(String productId, int quantity) {
    if (quantity <= 0) return remove(productId);
    for (final i in _items) {
      if (i.productId == productId) i.quantity = quantity.clamp(1, maxQty);
    }
    _save();
    notifyListeners();
  }

  void remove(String productId) {
    _items.removeWhere((i) => i.productId == productId);
    _save();
    notifyListeners();
  }

  void clear() {
    _items.clear();
    _save();
    notifyListeners();
  }

  List<Json> get payload => _items.map((i) => {'productId': i.productId, 'quantity': i.quantity}).toList();
}
