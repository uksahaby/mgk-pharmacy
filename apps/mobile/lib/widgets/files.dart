import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:pdfrx/pdfrx.dart';

import '../core/api.dart';
import '../core/theme.dart';
import 'common.dart';

class PickedFile {
  PickedFile(this.path, this.name, this.size);
  final String path;
  final String name;
  final int size;
  bool get isPdf => name.toLowerCase().endsWith('.pdf');
}

const _maxBytes = 8 * 1024 * 1024;

/// Bottom sheet: take a photo, choose from gallery, or choose a PDF. Enforces the API's 8 MB limit.
Future<PickedFile?> pickDocument(BuildContext context) async {
  final choice = await showModalBottomSheet<String>(
    context: context,
    showDragHandle: true,
    builder: (c) => SafeArea(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        ListTile(leading: const Icon(Icons.photo_camera_outlined), title: const Text('Take a photo'), onTap: () => Navigator.pop(c, 'camera')),
        ListTile(leading: const Icon(Icons.photo_library_outlined), title: const Text('Choose from gallery'), onTap: () => Navigator.pop(c, 'gallery')),
        ListTile(leading: const Icon(Icons.picture_as_pdf_outlined), title: const Text('Choose a PDF'), onTap: () => Navigator.pop(c, 'pdf')),
        const SizedBox(height: 8),
      ]),
    ),
  );
  if (choice == null) return null;
  PickedFile? picked;
  if (choice == 'pdf') {
    final files = await FilePicker.pickFiles(type: FileType.custom, allowedExtensions: ['pdf']);
    final f = files.firstOrNull;
    if (f?.path != null) picked = PickedFile(f!.path!, f.name, await File(f.path!).length());
  } else {
    final x = await ImagePicker().pickImage(source: choice == 'camera' ? ImageSource.camera : ImageSource.gallery, imageQuality: 85, maxWidth: 2400);
    if (x != null) picked = PickedFile(x.path, x.name, await x.length());
  }
  if (picked != null && picked.size > _maxBytes) {
    if (context.mounted) snack(context, 'That file is larger than 8 MB. Please choose a smaller one.', error: true);
    return null;
  }
  return picked;
}

/// Tappable field showing the chosen file, like the website's FileField.
class FilePickField extends StatelessWidget {
  const FilePickField({super.key, required this.label, required this.file, required this.onChanged, this.hint});
  final String label;
  final PickedFile? file;
  final ValueChanged<PickedFile?> onChanged;
  final String? hint;

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.inkSoft)),
        const SizedBox(height: 6),
        InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () async {
            final f = await pickDocument(context);
            if (f != null) onChanged(f);
          },
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: file != null ? AppColors.care50 : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: file != null ? AppColors.care500 : const Color(0xFFCBD5E1), width: 1.5),
            ),
            child: Row(children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(color: AppColors.slate100, borderRadius: BorderRadius.circular(10)),
                alignment: Alignment.center,
                child: file == null ? const Icon(Icons.add_a_photo_outlined, color: AppColors.inkSoft) : Text(file!.isPdf ? 'PDF' : 'IMG', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(file?.name ?? 'Take a photo or choose a file', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text(file == null ? 'PDF, JPG or PNG · up to 8 MB' : '${(file!.size / 1024 / 1024).toStringAsFixed(1)} MB · tap to change', style: const TextStyle(fontSize: 12, color: AppColors.inkMuted)),
                ]),
              ),
            ]),
          ),
        ),
        if (hint != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(hint!, style: const TextStyle(fontSize: 12, color: AppColors.inkMuted))),
      ]);
}

/// Shows a private file (prescription, ID, licence, receipt) fetched with the user's credentials.
class FileViewerScreen extends StatelessWidget {
  const FileViewerScreen({super.key, required this.apiPath, required this.title});
  final String apiPath;
  final String title;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(title)),
        backgroundColor: AppColors.slate100,
        body: Loader(
          load: () => api.download(apiPath),
          builder: (context, file, _) {
            if (file.contentType.contains('pdf')) return PdfViewer.data(file.bytes, sourceName: apiPath);
            return InteractiveViewer(maxScale: 5, child: Center(child: Image.memory(file.bytes, fit: BoxFit.contain)));
          },
        ),
      );
}
