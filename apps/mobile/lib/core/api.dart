import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'config.dart';

/// Error from the API, with optional per-field validation messages (same shape the website uses).
class ApiException implements Exception {
  ApiException(this.status, this.message, [this.fields = const {}, this.code]);
  final int status;
  final String message;
  final Map<String, String> fields;
  final String? code;

  @override
  String toString() => message;
}

/// Single HTTP client for the whole app. The session token lives in the platform's secure storage
/// (Android Keystore / iOS Keychain) and is sent as a Bearer token.
class Api {
  Api._() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'X-Client': 'mobile', 'Accept': 'application/json'},
    ));
    _dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) async {
      final token = await token_;
      if (token != null) options.headers['Authorization'] = 'Bearer $token';
      handler.next(options);
    }));
  }

  static final Api instance = Api._();
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'mgk_session';
  late final Dio _dio;
  String? _cachedToken;
  bool _loaded = false;

  /// Called whenever the API says the session is no longer valid (signed out elsewhere, deactivated...).
  void Function()? onUnauthorized;

  Future<String?> get token_ async {
    if (!_loaded) {
      _cachedToken = await _storage.read(key: _tokenKey);
      _loaded = true;
    }
    return _cachedToken;
  }

  Future<void> saveToken(String? token) async {
    _cachedToken = token;
    _loaded = true;
    if (token == null) {
      await _storage.delete(key: _tokenKey);
    } else {
      await _storage.write(key: _tokenKey, value: token);
    }
  }

  Future<Map<String, dynamic>> get(String path, {Map<String, dynamic>? query}) =>
      _send(() => _dio.get<dynamic>(path, queryParameters: _clean(query)));

  Future<Map<String, dynamic>> post(String path, [Object? body]) => _send(() => _dio.post<dynamic>(path, data: body ?? {}));

  Future<Map<String, dynamic>> put(String path, Object body) => _send(() => _dio.put<dynamic>(path, data: body));

  Future<Map<String, dynamic>> patch(String path, Object body) => _send(() => _dio.patch<dynamic>(path, data: body));

  Future<Map<String, dynamic>> delete(String path) => _send(() => _dio.delete<dynamic>(path));

  /// Multipart upload. [files] maps form field names to local file paths.
  Future<Map<String, dynamic>> upload(String path, {required Map<String, String> files, Map<String, String> fields = const {}}) async {
    final form = FormData.fromMap({
      ...fields,
      for (final e in files.entries) e.key: await MultipartFile.fromFile(e.value, filename: e.value.split(RegExp(r'[\\/]')).last),
    });
    return _send(() => _dio.post<dynamic>(path, data: form));
  }

  /// Downloads a private file (prescription, ID, receipt) with the user's credentials.
  Future<({Uint8List bytes, String contentType})> download(String path) async {
    try {
      final res = await _dio.get<List<int>>(path, options: Options(responseType: ResponseType.bytes));
      return (bytes: Uint8List.fromList(res.data ?? const []), contentType: res.headers.value('content-type') ?? '');
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  Map<String, dynamic>? _clean(Map<String, dynamic>? q) {
    if (q == null) return null;
    final out = <String, dynamic>{};
    q.forEach((k, v) {
      if (v != null && v.toString().isNotEmpty) out[k] = v;
    });
    return out;
  }

  Future<Map<String, dynamic>> _send(Future<Response<dynamic>> Function() run) async {
    try {
      final res = await run();
      final data = res.data;
      return data is Map<String, dynamic> ? data : <String, dynamic>{'data': data};
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  ApiException _toApiException(DioException e) {
    final res = e.response;
    if (res == null) {
      return ApiException(0, "We couldn't reach MGK Pharmacy. Check your internet connection and try again.");
    }
    final data = res.data;
    final body = data is Map ? data : const {};
    final fields = <String, String>{};
    if (body['fields'] is Map) (body['fields'] as Map).forEach((k, v) => fields['$k'] = '$v');
    final details = body['details'];
    final code = details is Map ? details['code'] as String? : null;
    if (res.statusCode == 401) onUnauthorized?.call();
    return ApiException(res.statusCode ?? 0, (body['error'] as String?) ?? 'Something went wrong. Please try again.', fields, code);
  }
}

final api = Api.instance;
