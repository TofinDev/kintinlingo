import React, { useMemo } from 'react';
import { ALL_WORDS_MAP, CURRICULUM } from '../data/curriculum';
import type { GradeLevel, Lesson, PlayerProfile } from '../types';
import { BarChart3, CheckCircle2, Lightbulb, Sparkles, Target, X } from 'lucide-react';

interface VocabAnalysisModalProps {
  player: PlayerProfile;
  currentGrade: GradeLevel;
  onSelectLesson?: (lesson: Lesson) => void;
  onClose: () => void;
}

const SUGGESTED_NEW_CATEGORIES: Record<GradeLevel['ageGroup'], { title: string; reason: string; examples: string }[]> = {
  kindergarten: [
    {
      title: '🔢 ตัวเลข 1–20 (Numbers)',
      reason: 'พื้นฐานสำคัญสำหรับวัยอนุบาล ใช้คู่กับสีและสิ่งของรอบตัว',
      examples: 'one, two, three, ten, twenty',
    },
    {
      title: '👨‍👩‍👧‍👦 ครอบครัว (My Family)',
      reason: 'คำศัพท์ใกล้ตัวที่สุด ช่วยให้เด็กเชื่อมโยงกับคนในบ้านได้ทันที',
      examples: 'mom, dad, sister, brother, baby',
    },
    {
      title: '🔺 รูปทรง (Shapes)',
      reason: 'ช่วยพัฒนาทักษะคณิตศาสตร์และสังเกตสิ่งของควบคู่ภาษาอังกฤษ',
      examples: 'circle, square, triangle, star',
    },
  ],
  lower_primary: [
    {
      title: '📅 วัน เดือน และเวลา (Days & Time)',
      reason: 'เด็ก ป.1–ป.3 เริ่มเรียนตารางเวลาและปฏิทินในชีวิตประจำวัน',
      examples: 'Monday, today, morning, o’clock',
    },
    {
      title: '👩‍⚕️ อาชีพต่างๆ (Occupations)',
      reason: 'ต่อยอดจากบทสนทนา “โตขึ้นอยากเป็นอะไร” ในหลักสูตรประถมต้น',
      examples: 'doctor, teacher, chef, pilot, police',
    },
    {
      title: '↔️ คำตรงข้าม (Opposites)',
      reason: 'ช่วยให้จำคำคุณศัพท์เป็นคู่ได้เร็วขึ้น 2 เท่า',
      examples: 'big/small, fast/slow, happy/sad',
    },
  ],
  upper_primary: [
    {
      title: '⏳ กริยาช่อง 2 & 3 (Irregular Verbs)',
      reason: 'หัวใจสำคัญของ ป.4–ป.6 สำหรับเล่าเหตุการณ์ในอดีตและสอบเข้า ม.1',
      examples: 'go–went, eat–ate, see–saw, write–wrote',
    },
    {
      title: '🔗 คำเชื่อมและคำบุพบท (Connectors & Prepositions)',
      reason: 'ช่วยให้อ่านจับใจความ (Reading) และแต่งประโยคยาวๆ ได้ถูกต้อง',
      examples: 'because, although, between, across',
    },
    {
      title: '✈️ การท่องเที่ยวและวัฒนธรรม (Travel & Culture)',
      reason: 'ตรงตามข้อสอบ A1 Movers / A2 Flyers และข้อสอบ O-NET ป.6',
      examples: 'passport, luggage, museum, festival',
    },
  ],
};

export const VocabAnalysisModal: React.FC<VocabAnalysisModalProps> = ({
  player,
  currentGrade,
  onSelectLesson,
  onClose,
}) => {
  const { learnedWords, wrongWords } = player.progress;

  // Breakdown by Word Type (POS)
  const posStats = useMemo(() => {
    const counts = { noun: 0, verb: 0, adj: 0, other: 0 };
    learnedWords.forEach((id) => {
      const w = ALL_WORDS_MAP.get(id);
      if (!w) return;
      const pos = w.phonicsOrPos.toLowerCase();
      if (pos.includes('verb')) counts.verb += 1;
      else if (pos.includes('adj')) counts.adj += 1;
      else if (pos.includes('noun') || pos.includes('/')) counts.noun += 1;
      else counts.other += 1;
    });
    return counts;
  }, [learnedWords]);

  // Breakdown by Lesson/Category in current grade
  const categoryStats = useMemo(() => {
    return currentGrade.lessons.map((lesson) => {
      const total = lesson.words.length;
      const learned = lesson.words.filter((w) => learnedWords.includes(w.id)).length;
      const missed = lesson.words.filter((w) => wrongWords.includes(w.id)).length;
      const pct = total > 0 ? Math.round((learned / total) * 100) : 0;
      return { lesson, total, learned, missed, pct };
    });
  }, [currentGrade, learnedWords, wrongWords]);

  // Also count total learned across all grades
  const allGradesTotal = useMemo(
    () => CURRICULUM.reduce((sum, g) => sum + g.lessons.reduce((s, l) => s + l.words.length, 0), 0),
    []
  );

  const recommendedLesson = useMemo(() => {
    // Prioritize category with missed words, otherwise lowest percentage
    const withMissed = categoryStats.find((c) => c.missed > 0);
    if (withMissed) return withMissed;
    const incomplete = [...categoryStats].sort((a, b) => a.pct - b.pct)[0];
    return incomplete;
  }, [categoryStats]);

  const futureIdeas = SUGGESTED_NEW_CATEGORIES[currentGrade.ageGroup];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm">
      <div className="animate-card-pop max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                วิเคราะห์คลังคำศัพท์ของ {player.name}
              </h2>
              <p className="text-xs text-slate-500 sm:text-sm">
                สรุปแนวคำศัพท์ที่ได้แล้ว & หมวดที่ควรฝึกหรือเพิ่มต่อไป
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Top Summary Cards */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-indigo-50 p-3.5 text-center ring-1 ring-indigo-100">
            <div className="font-en text-2xl font-bold text-indigo-700 sm:text-3xl">
              {learnedWords.length}
            </div>
            <div className="text-xs font-semibold text-indigo-900/70">
              จำได้แล้ว (จาก {allGradesTotal} คำ)
            </div>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-3.5 text-center ring-1 ring-emerald-100">
            <div className="font-en text-2xl font-bold text-emerald-700 sm:text-3xl">
              {posStats.noun}
            </div>
            <div className="text-xs font-semibold text-emerald-900/70">คำนาม / สิ่งของ</div>
          </div>
          <div className="rounded-2xl bg-amber-50 p-3.5 text-center ring-1 ring-amber-100">
            <div className="font-en text-2xl font-bold text-amber-700 sm:text-3xl">
              {posStats.verb + posStats.adj}
            </div>
            <div className="text-xs font-semibold text-amber-900/70">คำกริยา & คุณศัพท์</div>
          </div>
        </div>

        {/* Category Mastery in Current Grade */}
        <div className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
            <Target className="h-4 w-4 text-indigo-600" />
            ความถนัดรายหมวดในระดับ {currentGrade.nameTh}
          </h3>

          <div className="space-y-3">
            {categoryStats.map(({ lesson, total, learned, missed, pct }) => (
              <div
                key={lesson.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{lesson.icon}</span>
                    <div>
                      <div className="font-bold text-slate-900">{lesson.titleTh}</div>
                      <div className="font-en text-xs text-slate-500">{lesson.titleEn}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-indigo-700">
                      {learned}/{total} คำ ({pct}%)
                    </span>
                    {missed > 0 && (
                      <div className="text-[11px] font-bold text-rose-600">
                        ควรทบทวน {missed} คำ
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Immediate Action Recommendation */}
        {recommendedLesson && (
          <div className="mb-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50/80 p-4">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
                <div>
                  <div className="font-bold text-emerald-950">
                    หมวดที่แนะนำให้ฝึกต่อตอนนี้: {recommendedLesson.lesson.icon}{' '}
                    {recommendedLesson.lesson.titleTh}
                  </div>
                  <p className="text-xs text-emerald-800 sm:text-sm">
                    {recommendedLesson.missed > 0
                      ? `มีคำที่เคยตอบผิด ${recommendedLesson.missed} คำ ลองทบทวนซ้ำจะจำแม่นขึ้นมาก!`
                      : recommendedLesson.pct < 100
                        ? `ยังเก็บคำศัพท์ไม่ครบ (${recommendedLesson.learned}/${recommendedLesson.total} คำ)`
                        : 'จำได้ครบหมวดนี้แล้ว! ลองข้ามไปเรียนระดับชั้นถัดไปได้เลย'}
                  </p>
                </div>
              </div>

              {onSelectLesson && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectLesson(recommendedLesson.lesson);
                    onClose();
                  }}
                  className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 sm:text-sm"
                >
                  ไปฝึกหมวดนี้ →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Suggested New Categories to Add for This Age Group */}
        <div className="rounded-3xl bg-amber-50/70 p-5 ring-1 ring-amber-200/80">
          <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-amber-950">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            หมวดคำศัพท์ที่ควรเพิ่มเสริมสำหรับวัย {currentGrade.nameTh}
          </h3>
          <div className="space-y-3">
            {futureIdeas.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl bg-white p-3.5 shadow-xs ring-1 ring-amber-100"
              >
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  {item.title}
                </div>
                <p className="mt-1 text-xs text-slate-600 sm:text-sm">{item.reason}</p>
                <p className="font-en mt-1 text-xs font-semibold text-indigo-600">
                  ตัวอย่าง: {item.examples}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-indigo-600 py-3 text-base font-bold text-white shadow hover:bg-indigo-700 sm:w-auto sm:px-10"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
