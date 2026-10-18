import 'package:flutter/foundation.dart';

import '../core/api.dart';
import '../core/models.dart';

/// Who is signed in. Mirrors the website: the same accounts, roles and permissions.
class AuthState extends ChangeNotifier {
  AuthState() {
    api.onUnauthorized = () {
      if (_user != null) {
        _user = null;
        api.saveToken(null);
        notifyListeners();
      }
    };
  }

  User? _user;
  bool _ready = false;
  User? get user => _user;
  bool get ready => _ready;
  bool get signedIn => _user != null;

  Future<void> load() async {
    try {
      if (await api.token_ != null) {
        // A patchy connection at launch must not look like being signed out: retry network
        // failures a few times. The saved session is only cleared when the server rejects it.
        for (var attempt = 1; ; attempt++) {
          try {
            final res = await api.get('/auth/me');
            final u = res['user'];
            _user = u == null ? null : User(u as Json);
            if (_user == null) await api.saveToken(null);
            break;
          } on ApiException catch (e) {
            if (e.status != 0 || attempt == 4) rethrow;
            await Future<void>.delayed(Duration(seconds: attempt));
          }
        }
      }
    } catch (_) {
      // still offline: show the signed-out view but keep the saved session for the next launch
    } finally {
      _ready = true;
      notifyListeners();
    }
  }

  Future<void> refresh() async {
    final res = await api.get('/auth/me');
    final u = res['user'];
    _user = u == null ? null : User(u as Json);
    notifyListeners();
  }

  Future<void> _accept(Json res) async {
    await api.saveToken(res['token'] as String?);
    _user = User(res['user'] as Json);
    notifyListeners();
  }

  Future<void> login(String email, String password) async => _accept(await api.post('/auth/login', {'email': email, 'password': password}));

  Future<void> register(Json data) async => _accept(await api.post('/auth/register', data));

  Future<void> changePassword(String current, String next) async =>
      _accept(await api.post('/auth/change-password', {'currentPassword': current, 'newPassword': next}));

  Future<void> logout() async {
    try {
      await api.post('/auth/logout');
    } catch (_) {}
    await api.saveToken(null);
    _user = null;
    notifyListeners();
  }

  void setUser(Json u) {
    _user = User(u);
    notifyListeners();
  }
}
