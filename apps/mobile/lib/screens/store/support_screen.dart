import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/config.dart';
import '../../core/theme.dart';
import '../../widgets/common.dart';
import '../../widgets/ui.dart';

/// Pharmacist support: chat on WhatsApp first, then the other ways to reach the pharmacy.
class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Pharmacist Support')),
    body: ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [AppColors.brand600, AppColors.brand800]),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.16), shape: BoxShape.circle),
                    child: const Icon(Icons.support_agent_rounded, color: Colors.white, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Chat with a Pharmacist',
                          style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 4),
                        const Text('Get expert advice on your health and medications.', style: TextStyle(color: Color(0xDDFFFFFF), height: 1.35)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppColors.brand700, minimumSize: const Size(0, 44)),
                onPressed: () => openLink(Site.whatsapp),
                icon: const Text('Start Chat'),
                label: const Icon(Icons.arrow_forward_rounded, size: 18),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            const Icon(Icons.schedule_rounded, size: 16, color: AppColors.inkMuted),
            const SizedBox(width: 6),
            Expanded(
              child: Text('Pharmacists available ${Site.hours.map((h) => '${h.$1}, ${h.$2}').join(' · ')}', style: const TextStyle(fontSize: 12.5, color: AppColors.inkMuted)),
            ),
          ],
        ),
        const SizedBox(height: 20),
        const SectionHeader('Other Support Channels'),
        MenuRow(icon: Icons.call_outlined, title: 'Call Us', subtitle: Site.phone, onTap: () => openLink(Site.phoneUri)),
        const SizedBox(height: 10),
        MenuRow(icon: Icons.chat_outlined, title: 'WhatsApp', subtitle: 'Chat on WhatsApp', onTap: () => openLink(Site.whatsapp)),
        const SizedBox(height: 10),
        MenuRow(icon: Icons.mail_outline_rounded, title: 'Email Us', subtitle: Site.email, onTap: () => openLink('mailto:${Site.email}')),
        const SizedBox(height: 10),
        MenuRow(icon: Icons.quiz_outlined, title: 'FAQs', subtitle: 'Find answers to common questions', onTap: () => context.push('/info/faq')),
        const SizedBox(height: 10),
        MenuRow(icon: Icons.edit_note_rounded, title: 'Send a message', subtitle: 'We reply within one working day', onTap: () => context.push('/contact')),
        const SizedBox(height: 20),
        const AlertBox(tone: AlertTone.warning, message: 'In an emergency, go to the nearest hospital or call 112. Chat is not for urgent medical care.'),
      ],
    ),
  );
}
