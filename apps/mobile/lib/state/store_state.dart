import 'package:flutter/foundation.dart' show ChangeNotifier;

import '../core/api.dart';
import '../core/models.dart';

/// Shared catalogue data used across many screens (categories, delivery zones, payment options).
class StoreState extends ChangeNotifier {
  List<Category> categories = [];
  StoreInfo? info;

  Future<void> load() async {
    try {
      final results = await Future.wait([api.get('/categories'), api.get('/store-info')]);
      categories = (results[0]['categories'] as List).map((c) => Category(c as Json)).toList();
      info = StoreInfo(results[1]);
      notifyListeners();
    } catch (_) {
      // screens show their own retry state
    }
  }

  Category? category(String slug) => categories.where((c) => c.slug == slug).firstOrNull;
}
