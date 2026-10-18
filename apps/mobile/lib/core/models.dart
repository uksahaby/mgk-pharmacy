// Typed views of the API's JSON. Field names match the website's lib/types.ts.

typedef Json = Map<String, dynamic>;

List<T> _list<T>(Object? v, T Function(Json) f) => (v as List? ?? const []).map((e) => f(e as Json)).toList();
int _int(Object? v) => (v as num?)?.toInt() ?? 0;
double? _dbl(Object? v) => (v as num?)?.toDouble();

class User {
  User(this.j);
  final Json j;
  String get id => j['id'] as String;
  String get email => j['email'] as String;
  String get firstName => j['firstName'] as String;
  String get lastName => j['lastName'] as String;
  String get fullName => '$firstName $lastName';
  String? get phone => j['phone'] as String?;
  String get role => j['role'] as String;
  String get verificationStatus => j['verificationStatus'] as String;
  bool get mustChangePassword => j['mustChangePassword'] == true;
  List<String> get permissions => (j['permissions'] as List? ?? const []).cast<String>();
  bool can(String permission) => permissions.contains(permission);
  bool get isStaff => can('dashboard.view');
  bool get isRider => can('deliveries.ride');
  String get initials => '${firstName.isEmpty ? '' : firstName[0]}${lastName.isEmpty ? '' : lastName[0]}'.toUpperCase();
}

class Category {
  Category(this.j);
  final Json j;
  String get slug => j['slug'] as String;
  String get name => j['name'] as String;
  String get description => j['description'] as String? ?? '';
  String get icon => j['icon'] as String? ?? 'pill';
  int get productCount => _int(j['productCount']);
}

class Product {
  Product(this.j);
  final Json j;
  String get id => j['id'] as String;
  String get slug => j['slug'] as String;
  String get name => j['name'] as String;
  String get genericName => j['genericName'] as String? ?? '';
  String get brand => j['brand'] as String? ?? name;
  String? get strength => j['strength'] as String?;
  String get dosageForm => j['dosageForm'] as String? ?? '';
  String get packSize => j['packSize'] as String? ?? '';
  int get priceKobo => _int(j['priceKobo']);
  int? get compareAtKobo => (j['compareAtKobo'] as num?)?.toInt();
  String get rxStatus => j['rxStatus'] as String? ?? 'OTC';
  bool get coldChain => j['coldChain'] == true;
  bool get inStock => j['inStock'] == true;
  bool get lowStock => j['lowStock'] == true;
  String get categoryName => (j['category'] as Json?)?['name'] as String? ?? '';
  String get categorySlug => (j['category'] as Json?)?['slug'] as String? ?? '';
  String get icon => (j['category'] as Json?)?['icon'] as String? ?? 'pill';
  // detail-only
  String? get manufacturer => j['manufacturer'] as String?;
  String get description => j['description'] as String? ?? '';
  String get usage => j['usage'] as String? ?? '';
  String get warnings => j['warnings'] as String? ?? '';
  String get storage => j['storage'] as String? ?? '';
  int get stockAvailable => _int(j['stockAvailable']);
  String? get nextExpiry => j['nextExpiry'] as String?;
  int get discountPercent => compareAtKobo != null && compareAtKobo! > priceKobo ? ((1 - priceKobo / compareAtKobo!) * 100).round() : 0;
}

class Zone {
  Zone(this.j);
  final Json j;
  String get code => j['code'] as String;
  String get name => j['name'] as String;
  String get description => j['description'] as String? ?? '';
  int get feeKobo => _int(j['feeKobo']);
  String get etaLabel => j['etaLabel'] as String? ?? '';
}

class StoreInfo {
  StoreInfo(this.j);
  final Json j;
  List<String> get states => (j['states'] as List).cast<String>();
  List<Zone> get zones => _list(j['zones'], Zone.new);
  int get freeDeliveryThresholdKobo => _int(j['freeDeliveryThresholdKobo']);
  bool get paystack => (j['paymentMethods'] as Json)['paystack'] == true;
  Json get bank => j['bank'] as Json;
  int get unpaidOrderTtlHours => _int(j['unpaidOrderTtlHours']);
  double get storeLat => _dbl((j['store'] as Json)['lat'])!;
  double get storeLng => _dbl((j['store'] as Json)['lng'])!;
}

class QuoteLine {
  QuoteLine(this.j);
  final Json j;
  String get productId => j['productId'] as String;
  String get name => j['name'] as String;
  String get rxStatus => j['rxStatus'] as String;
  bool get coldChain => j['coldChain'] == true;
  int get priceKobo => _int(j['priceKobo']);
  int get available => _int(j['available']);
  String? get issue => j['issue'] as String?;
}

class Quote {
  Quote(this.j);
  final Json j;
  List<QuoteLine> get lines => _list(j['lines'], QuoteLine.new);
  int get subtotalKobo => _int(j['subtotalKobo']);
  int get shippingKobo => _int(j['shippingKobo']);
  int get totalKobo => _int(j['totalKobo']);
  Json? get zone => j['zone'] as Json?;
  bool get freeDelivery => j['freeDelivery'] == true;
  int get freeDeliveryThresholdKobo => _int(j['freeDeliveryThresholdKobo']);
  int get amountToFreeDeliveryKobo => _int(j['amountToFreeDeliveryKobo']);
  bool get requiresRx => j['requiresRx'] == true;
  bool get requiresVerification => j['requiresVerification'] == true;
  bool get hasColdChain => j['hasColdChain'] == true;
  bool get hasIssues => lines.any((l) => l.issue != null);
  QuoteLine? line(String productId) {
    for (final l in lines) {
      if (l.productId == productId) return l;
    }
    return null;
  }
}

class OrderItem {
  OrderItem(this.j);
  final Json j;
  String get productId => j['productId'] as String;
  String? get slug => j['slug'] as String?;
  String get icon => j['icon'] as String? ?? 'pill';
  String get name => j['name'] as String;
  String get packSize => j['packSize'] as String? ?? '';
  String get rxStatus => j['rxStatus'] as String? ?? 'OTC';
  int get priceKobo => _int(j['priceKobo']);
  int get quantity => _int(j['quantity']);
}

class OrderEvent {
  OrderEvent(this.j);
  final Json j;
  String get type => j['type'] as String? ?? '';
  String get message => j['message'] as String;
  String get createdAt => j['createdAt'] as String;
  String? get actor => j['actor'] as String?;
}

class Order {
  Order(this.j);
  final Json j;
  String get number => j['number'] as String;
  String get accessKey => j['accessKey'] as String? ?? '';
  String get status => j['status'] as String;
  String get paymentMethod => j['paymentMethod'] as String;
  String get paymentStatus => j['paymentStatus'] as String;
  String? get paymentRef => j['paymentRef'] as String?;
  bool get hasProof => j['hasProof'] == true;
  String get fulfilment => j['fulfilment'] as String;
  bool get isDelivery => fulfilment == 'DELIVERY';
  Json get customer => j['customer'] as Json;
  Json? get address => j['address'] as Json?;
  Json? get zone => j['zone'] as Json?;
  List<OrderItem> get items => _list(j['items'], OrderItem.new);
  int get subtotalKobo => _int(j['subtotalKobo']);
  int get shippingKobo => _int(j['shippingKobo']);
  int get totalKobo => _int(j['totalKobo']);
  String? get notes => j['notes'] as String?;
  bool get requiresRx => j['requiresRx'] == true;
  Json? get prescription => j['prescription'] as Json?;
  List<OrderEvent> get events => _list(j['events'], OrderEvent.new);
  bool get canCancel => j['canCancel'] == true;
  bool get canPayOnline => j['canPayOnline'] == true;
  Json? get bankDetails => j['bankDetails'] as Json?;
  String? get payBy => j['payBy'] as String?;
  Json? get delivery => j['delivery'] as Json?;
  bool get live => delivery?['live'] == true;
  String? get deliveryCode => delivery?['code'] as String?;
  String get createdAt => j['createdAt'] as String;
  String? get paidAt => j['paidAt'] as String?;
  String? get cancelledAt => j['cancelledAt'] as String?;
  int get itemCount => items.fold(0, (s, i) => s + i.quantity);
}

class Prescription {
  Prescription(this.j);
  final Json j;
  String get id => j['id'] as String;
  String get patientName => j['patientName'] as String;
  String? get prescriberName => j['prescriberName'] as String?;
  String? get facility => j['facility'] as String?;
  String? get issuedOn => j['issuedOn'] as String?;
  String get mimeType => j['mimeType'] as String? ?? '';
  String? get notes => j['notes'] as String?;
  String get status => j['status'] as String;
  String? get reviewerNote => j['reviewerNote'] as String?;
  String? get validUntil => j['validUntil'] as String?;
  bool get expired => j['expired'] == true;
  String get createdAt => j['createdAt'] as String;
}

class Address {
  Address(this.j);
  final Json j;
  String get id => j['id'] as String;
  String get label => j['label'] as String? ?? 'Home';
  String get fullName => j['fullName'] as String;
  String get phone => j['phone'] as String;
  String get line1 => j['line1'] as String;
  String? get line2 => j['line2'] as String?;
  String get city => j['city'] as String;
  String get state => j['state'] as String;
  String? get landmark => j['landmark'] as String?;
  bool get isDefault => j['isDefault'] == true;
  String get oneLine => [line1, if (line2?.isNotEmpty == true) line2, city, state].join(', ');
}

class Tracking {
  Tracking(this.j);
  final Json j;
  String get status => j['status'] as String;
  bool get live => j['live'] == true;
  ({double lat, double lng}) get origin => (lat: _dbl((j['origin'] as Json)['lat'])!, lng: _dbl((j['origin'] as Json)['lng'])!);
  ({double lat, double lng})? get destination {
    final d = j['destination'] as Json?;
    return d == null ? null : (lat: _dbl(d['lat'])!, lng: _dbl(d['lng'])!);
  }

  String? get destinationSource => j['destinationSource'] as String?;
  Json? get rider => j['rider'] as Json?;
  Json? get position => j['position'] as Json?;
  List<List<double>> get trail => (j['trail'] as List? ?? const []).map((p) => (p as List).map((n) => (n as num).toDouble()).toList()).toList();
  int? get etaMinutes => (j['etaMinutes'] as num?)?.toInt();
  bool get stale => j['stale'] == true;
}
