import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { PDFDocument, PageSizes, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib/dist/pdf-lib.esm.js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/src/lib/authStore';
import { useTheme } from '@/src/hooks/useTheme';
import { useThemedStyles } from '@/src/hooks/useThemedStyles';
import type { AppTheme } from '@/src/lib/themeStore';
import { borderRadius, fontFamilies, spacing } from '@/src/theme';

const DRAFT_KEY = '@citians/resume-builder-draft';

type ResumeData = {
  fullName: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  summary: string;
  experience: string;
  projects: string;
  education: string;
  skills: string;
  certifications: string;
  tools: string;
  achievements: string;
};

function initialResume(profile: any, roleProfile: any): ResumeData {
  const student = roleProfile?.type === 'STUDENT' ? roleProfile.data : null;
  return {
    fullName: profile?.name ?? '',
    email: profile?.email ?? '',
    phone: profile?.phone ?? '',
    linkedin: '',
    github: '',
    summary: '',
    experience: '',
    projects: '',
    education: student ? `${student.year} year ${student.section} section · ${roleProfile.departmentName}` : '',
    skills: '',
    certifications: '',
    tools: '',
    achievements: '',
  };
}

function lines(value: string): string[] {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

const A4_WIDTH = PageSizes.A4[0];
const A4_HEIGHT = PageSizes.A4[1];
const PDF_MARGIN = 42;
const PDF_INK = rgb(0.09, 0.09, 0.09);
const PDF_MUTED = rgb(0.28, 0.28, 0.28);

type PdfLayout = { document: PDFDocument; page: PDFPage; y: number; body: PDFFont; bodyBold: PDFFont; sans: PDFFont; sansBold: PDFFont };

function normalizePdfText(value: string): string {
  return value.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/·/g, '|').replace(/[^\x20-\x7E\n]/g, '');
}

function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let encoded = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const third = index + 2 < bytes.length ? bytes[index + 2] : 0;
    encoded += alphabet[first >> 2];
    encoded += alphabet[((first & 3) << 4) | (second >> 4)];
    encoded += index + 1 < bytes.length ? alphabet[((second & 15) << 2) | (third >> 6)] : '=';
    encoded += index + 2 < bytes.length ? alphabet[third & 63] : '=';
  }
  return encoded;
}

function wrapPdfText(value: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const result: string[] = [];
  for (const sourceLine of normalizePdfText(value).split('\n')) {
    const words = sourceLine.trim().split(/\s+/).filter(Boolean);
    if (!words.length) { result.push(''); continue; }
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        result.push(current);
        current = word;
      } else current = candidate;
    }
    if (current) result.push(current);
  }
  return result;
}

function ensurePdfSpace(layout: PdfLayout, height: number) {
  if (layout.y - height < PDF_MARGIN) {
    layout.page = layout.document.addPage(PageSizes.A4);
    layout.y = A4_HEIGHT - PDF_MARGIN;
  }
}

function drawPdfRule(layout: PdfLayout, thickness = 0.8) {
  layout.page.drawLine({ start: { x: PDF_MARGIN, y: layout.y }, end: { x: A4_WIDTH - PDF_MARGIN, y: layout.y }, thickness, color: PDF_INK });
  layout.y -= 7;
}

function drawPdfLines(layout: PdfLayout, value: string, font: PDFFont, size: number, maxWidth: number, indent = 0, leading = size * 1.4, color = PDF_INK) {
  const wrapped = wrapPdfText(value, font, size, maxWidth - indent);
  for (const line of wrapped) {
    ensurePdfSpace(layout, leading);
    layout.page.drawText(line, { x: PDF_MARGIN + indent, y: layout.y, size, font, color });
    layout.y -= leading;
  }
}

function drawPdfSectionTitle(layout: PdfLayout, title: string) {
  ensurePdfSpace(layout, 36);
  layout.y -= 6;
  drawPdfRule(layout, 0.75);
  layout.y -= 2;
  layout.page.drawText(normalizePdfText(title).toUpperCase(), { x: PDF_MARGIN, y: layout.y, size: 10.5, font: layout.sansBold, color: PDF_INK });
  layout.y -= 13;
}

function drawPdfBulletList(layout: PdfLayout, value: string, boldFirst = false) {
  for (const item of lines(value)) {
    const [first, ...rest] = item.split('|').map((part) => part.trim());
    const text = rest.length ? `${first} - ${rest.join(' - ')}` : first;
    const font = boldFirst && !rest.length ? layout.bodyBold : layout.body;
    const wrapped = wrapPdfText(text, font, 9.2, A4_WIDTH - PDF_MARGIN * 2 - 16);
    wrapped.forEach((line, index) => {
      ensurePdfSpace(layout, 13.2);
      layout.page.drawText(index === 0 ? `- ${line}` : `  ${line}`, { x: PDF_MARGIN, y: layout.y, size: 9.2, font, color: PDF_INK });
      layout.y -= 13.2;
    });
    layout.y -= 4;
  }
}

async function buildResumePdf(data: ResumeData): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const layout: PdfLayout = {
    document,
    page: document.addPage(PageSizes.A4),
    y: A4_HEIGHT - PDF_MARGIN,
    body: await document.embedFont(StandardFonts.TimesRoman),
    bodyBold: await document.embedFont(StandardFonts.TimesRomanBold),
    sans: await document.embedFont(StandardFonts.TimesRoman),
    sansBold: await document.embedFont(StandardFonts.TimesRomanBold),
  };
  const name = normalizePdfText(data.fullName || 'YOUR NAME').toUpperCase();
  const nameSize = 22;
  layout.page.drawText(name, { x: (A4_WIDTH - layout.bodyBold.widthOfTextAtSize(name, nameSize)) / 2, y: layout.y, size: nameSize, font: layout.bodyBold, color: PDF_INK });
  layout.y -= 25;
  const contact = [data.email, data.linkedin, data.phone, data.github].filter(Boolean).map(normalizePdfText).join(' | ') || 'email | LinkedIn | phone | GitHub';
  const contactLines = wrapPdfText(contact, layout.sans, 8.2, A4_WIDTH - PDF_MARGIN * 2);
  contactLines.forEach((line) => { layout.page.drawText(line, { x: (A4_WIDTH - layout.sans.widthOfTextAtSize(line, 8.2)) / 2, y: layout.y, size: 8.2, font: layout.sans, color: PDF_MUTED }); layout.y -= 11; });
  layout.y -= 2;

  if (data.summary.trim()) { drawPdfSectionTitle(layout, 'Summary'); drawPdfLines(layout, data.summary, layout.body, 9.5, A4_WIDTH - PDF_MARGIN * 2, 0, 13.3); layout.y -= 6; }
  if (data.experience.trim()) {
    drawPdfSectionTitle(layout, 'Internship Experience');
    for (const item of lines(data.experience)) {
      const parts = item.split('|').map((part) => normalizePdfText(part.trim()));
      const [organisation, role, dates, details] = parts;
      if (parts.length < 2) {
        drawPdfLines(layout, item, layout.bodyBold, 9.3, A4_WIDTH - PDF_MARGIN * 2, 0, 13.2);
        layout.y -= 4;
        continue;
      }
      ensurePdfSpace(layout, 30);
      const title = organisation || normalizePdfText(item);
      const titleWidth = dates ? A4_WIDTH - PDF_MARGIN * 2 - layout.bodyBold.widthOfTextAtSize(dates, 9.3) - 14 : A4_WIDTH - PDF_MARGIN * 2;
      drawPdfLines(layout, title, layout.bodyBold, 9.3, titleWidth, 0, 13.2);
      if (dates) { const width = layout.bodyBold.widthOfTextAtSize(dates, 9.3); layout.page.drawText(dates, { x: A4_WIDTH - PDF_MARGIN - width, y: layout.y + 13.2, size: 9.3, font: layout.bodyBold, color: PDF_INK }); }
      if (role) { drawPdfLines(layout, role, layout.bodyBold, 9.2, A4_WIDTH - PDF_MARGIN * 2 - 12, 12, 13); }
      if (details) { drawPdfLines(layout, details, layout.body, 9.2, A4_WIDTH - PDF_MARGIN * 2 - 12, 12, 13); }
      layout.y -= 7;
    }
    layout.y -= 2;
  }
  if (data.projects.trim()) { drawPdfSectionTitle(layout, 'Projects'); drawPdfBulletList(layout, data.projects, true); layout.y -= 2; }
  if (data.education.trim()) { drawPdfSectionTitle(layout, 'Education'); drawPdfLines(layout, data.education, layout.body, 9.5, A4_WIDTH - PDF_MARGIN * 2, 0, 13.3); layout.y -= 6; }
  if (data.skills.trim()) { drawPdfSectionTitle(layout, 'Technical Skills'); drawPdfLines(layout, data.skills.replace(/\n/g, ' | '), layout.bodyBold, 9.2, A4_WIDTH - PDF_MARGIN * 2, 0, 13); layout.y -= 6; }
  if (data.certifications.trim()) { drawPdfSectionTitle(layout, 'Certifications'); drawPdfBulletList(layout, data.certifications); layout.y -= 2; }
  if (data.tools.trim()) { drawPdfSectionTitle(layout, 'Technical Tools'); drawPdfLines(layout, data.tools.replace(/\n/g, ' | '), layout.body, 9.2, A4_WIDTH - PDF_MARGIN * 2, 0, 13); layout.y -= 6; }
  if (data.achievements.trim()) { drawPdfSectionTitle(layout, 'Achievements'); drawPdfLines(layout, data.achievements.replace(/\n/g, ' | '), layout.body, 9.2, A4_WIDTH - PDF_MARGIN * 2, 0, 13); layout.y -= 6; }
  return document.save();
}

export default function ResumeBuilderScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((state) => state.profile);
  const roleProfile = useAuthStore((state) => state.roleProfile);
  const defaults = useMemo(() => initialResume(profile, roleProfile), [profile, roleProfile]);
  const [data, setData] = useState<ResumeData>(defaults);
  const [hydrated, setHydrated] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(DRAFT_KEY).then((stored) => {
      if (stored) setData({ ...defaults, ...(JSON.parse(stored) as Partial<ResumeData>) });
      setHydrated(true);
    }).catch(() => setHydrated(true));
  }, [defaults]);

  useEffect(() => {
    if (hydrated) void AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  }, [data, hydrated]);

  const update = (key: keyof ResumeData, value: string) => setData((current) => ({ ...current, [key]: value }));

  const exportResume = async () => {
    if (!data.fullName.trim()) {
      Alert.alert('Add your name first', 'Your name is required before exporting the resume.');
      return;
    }
    setExporting(true);
    try {
      const pdfBytes = await buildResumePdf(data);
      const safeName = normalizePdfText(data.fullName || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'resume';
      if (Platform.OS === 'web') {
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${safeName}-resume.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }
      const fileUri = `${FileSystem.cacheDirectory}${safeName}-resume-${Date.now()}.pdf`;
      await FileSystem.writeAsStringAsync(fileUri, bytesToBase64(pdfBytes), { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: 'Save or share your resume', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('Resume ready', `Your PDF was created at ${fileUri}`);
      }
    } catch (error) {
      Alert.alert('Could not create resume', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top}>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
      <View style={styles.hero}><Text style={styles.eyebrow}>CAREER TOOL / 01</Text><Text style={styles.heroTitle}>Build a resume that feels like you.</Text><Text style={styles.heroText}>A clean, A4-ready template inspired by your classic one-page resume. Sign in to prefill your campus details, or start from scratch without an account.</Text></View>
      <View style={styles.info}><Ionicons name="sparkles-outline" size={18} color="#7B51E8" /><Text style={styles.infoText}>Use one item per line. For experience, use: Company | Role | Dates | Achievement. The button creates a standalone A4 PDF download.</Text></View>
      <Section title="Header" subtitle="The details recruiters see first.">
        <Field label="Full name" value={data.fullName} onChangeText={(value) => update('fullName', value)} placeholder="Your full name" />
        <Field label="Email" value={data.email} onChangeText={(value) => update('email', value)} placeholder="you@example.com" keyboardType="email-address" />
        <Field label="Phone" value={data.phone} onChangeText={(value) => update('phone', value)} placeholder="+91 ..." keyboardType="phone-pad" />
        <Field label="LinkedIn URL" value={data.linkedin} onChangeText={(value) => update('linkedin', value)} placeholder="linkedin.com/in/yourname" />
        <Field label="GitHub handle or URL" value={data.github} onChangeText={(value) => update('github', value)} placeholder="github.com/yourname" />
      </Section>
      <Section title="Profile summary" subtitle="Two or three focused lines about your direction."><Field multiline value={data.summary} onChangeText={(value) => update('summary', value)} placeholder="AI and software engineering student building..." /></Section>
      <Section title="Experience" subtitle="One entry per line: Company | Role | Dates | Achievement"><Field multiline value={data.experience} onChangeText={(value) => update('experience', value)} placeholder="Optisol Business Solutions | AI Agents Engineer | Jun 2025 - Dec 2025 | Built production retrieval workflows" /></Section>
      <Section title="Projects" subtitle="One entry per line: Project | What you built | Link"><Field multiline value={data.projects} onChangeText={(value) => update('projects', value)} placeholder="RecruitAI | Agentic recruitment platform | github.com/..." /></Section>
      <Section title="Education"><Field multiline value={data.education} onChangeText={(value) => update('education', value)} placeholder="Degree, college, graduation year, CGPA" /></Section>
      <Section title="Skills"><Field multiline value={data.skills} onChangeText={(value) => update('skills', value)} placeholder="Python, FastAPI, RAG, PostgreSQL, React Native" /></Section>
      <Section title="Certifications" subtitle="One certification per line"><Field multiline value={data.certifications} onChangeText={(value) => update('certifications', value)} placeholder="Generative AI and LLMs — IBM, 2025" /></Section>
      <Section title="Technical tools"><Field multiline value={data.tools} onChangeText={(value) => update('tools', value)} placeholder="GitHub, Firebase, VS Code, Docker, Cursor" /></Section>
      <Section title="Achievements"><Field multiline value={data.achievements} onChangeText={(value) => update('achievements', value)} placeholder="Hackathon winner, finalist, publication, leadership" /></Section>
    </ScrollView>
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.sm), backgroundColor: colors.surface, borderTopColor: colors.border }]}><Pressable onPress={() => void exportResume()} disabled={exporting} style={[styles.exportButton, { backgroundColor: colors.primary }]}>{exporting ? <ActivityIndicator color="#fff" /> : <><Ionicons name="download-outline" size={19} color="#fff" /><Text style={styles.exportText}>Download resume PDF</Text></>}</Pressable></View>
  </KeyboardAvoidingView>;
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}{children}</View>;
}

function Field({ label, multiline, ...props }: { label?: string; multiline?: boolean } & ComponentProps<typeof TextInput>) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return <View style={styles.field}>{label ? <Text style={styles.label}>{label}</Text> : null}<TextInput {...props} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.input, multiline && styles.multiline, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} placeholderTextColor={colors.textMuted} /></View>;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  hero: { backgroundColor: '#FFF0C2', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: '#F6D982', padding: spacing.lg },
  eyebrow: { color: '#D45772', fontFamily: fontFamilies.mono, fontSize: 10, letterSpacing: 1.2 },
  heroTitle: { color: '#29233D', fontFamily: 'serif', fontSize: 29, lineHeight: 34, fontWeight: '700', marginTop: spacing.sm },
  heroText: { color: '#706477', fontFamily: fontFamilies.body, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: '#F1ECFF', borderRadius: borderRadius.md, padding: spacing.md },
  infoText: { flex: 1, color: '#5D3FD3', fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 17 },
  section: { backgroundColor: theme.colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: theme.colors.border, padding: spacing.md, gap: spacing.sm },
  sectionTitle: { color: theme.colors.text, fontFamily: fontFamilies.display, fontSize: 18 },
  sectionSubtitle: { color: theme.colors.textMuted, fontFamily: fontFamilies.body, fontSize: 11, lineHeight: 16 },
  field: { gap: 5 },
  label: { color: theme.colors.textMuted, fontFamily: fontFamilies.semibold, fontSize: 11 },
  input: { minHeight: 46, borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontFamily: fontFamilies.body, fontSize: 14 },
  multiline: { minHeight: 105, paddingTop: spacing.sm },
  footer: { borderTopWidth: 1, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  exportButton: { minHeight: 50, borderRadius: borderRadius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  exportText: { color: '#fff', fontFamily: fontFamilies.bold, fontSize: 15 },
});
