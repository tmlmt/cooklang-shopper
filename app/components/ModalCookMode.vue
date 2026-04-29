<script setup lang="ts">
import {
  formatQuantity,
  formatQuantityWithUnit,
  isSectionActive,
  isStepActive,
  type Recipe,
  type RecipeChoices,
  type Step,
  type Cookware,
  type FixedValue,
  type Range,
  type Timer,
} from "@tmlmt/cooklang-parser";
import { useSwipe, onClickOutside, useWebNotification } from "@vueuse/core";

const props = defineProps<{
  recipe: Recipe;
  choices: RecipeChoices;
  stepImagesByNumber?: Record<string, string>;
}>();

const emit = defineEmits<{ close: [] }>();

defineShortcuts({
  escape: () => emit("close"),
  arrowleft: () => goPrev(),
  arrowright: () => goNext(),
});

// --- Slide data model ---

type CookSlide =
  | { type: "ingredients" }
  | { type: "section"; name: string; optional: boolean }
  | { type: "done" }
  | {
      type: "step";
      step: Step;
      stepNumber: number;
      sectionIndex: number;
      stepIndexInSection: number;
      optional: boolean;
      stepImage?: string;
    };

const slides = computed<CookSlide[]>(() => {
  const result: CookSlide[] = [{ type: "ingredients" }];
  const activeVariant = props.choices?.variant;
  let stepCounter = 0;

  props.recipe.sections.forEach((section, sIdx) => {
    const sectionIsActive = isSectionActive(section, activeVariant);
    if (!sectionIsActive) return;

    if (section.name) {
      result.push({
        type: "section",
        name: section.name,
        optional: section.optional ?? false,
      });
    }

    let stepInSection = 0;
    for (const item of section.content) {
      if (item.type === "step") {
        const stepIsActive =
          sectionIsActive && isStepActive(item, activeVariant);
        if (!stepIsActive) continue;
        stepCounter++;
        const stepImage =
          props.stepImagesByNumber?.[String(stepCounter)] ?? undefined;
        result.push({
          type: "step",
          step: item,
          stepNumber: stepCounter,
          sectionIndex: sIdx,
          stepIndexInSection: stepInSection,
          optional: item.optional ?? false,
          stepImage,
        });
        stepInSection++;
      }
    }
  });

  result.push({ type: "done" });
  return result;
});

// --- Progress tracking ---

const progressSteps = computed(() =>
  slides.value.filter((s) => s.type === "ingredients" || s.type === "step"),
);

const totalProgressSteps = computed(() => progressSteps.value.length);

const currentProgressIndex = computed(() => {
  const current = slides.value[currentSlideIndex.value];
  if (!current) return 0;
  // Done slide: all progress complete
  if (current.type === "done") return totalProgressSteps.value - 1;
  if (current.type === "ingredients" || current.type === "step") {
    return progressSteps.value.indexOf(current);
  }
  // For section title slides, find the last progress step before this index
  for (let i = currentSlideIndex.value - 1; i >= 0; i--) {
    const s = slides.value[i]!;
    if (s.type === "ingredients" || s.type === "step") {
      return progressSteps.value.indexOf(s);
    }
  }
  return 0;
});

// --- Navigation ---

const currentSlideIndex = ref(0);
const transitionDirection = ref<"slide-left" | "slide-right">("slide-left");

function goNext() {
  if (currentSlideIndex.value < slides.value.length - 1) {
    transitionDirection.value = "slide-left";
    currentSlideIndex.value++;
  }
}

function goPrev() {
  if (currentSlideIndex.value > 0) {
    transitionDirection.value = "slide-right";
    currentSlideIndex.value--;
  }
}

function skipSection() {
  const current = slides.value[currentSlideIndex.value];
  if (current?.type !== "section") return;
  // Find the next slide that isn't a step belonging to this section's name
  for (let i = currentSlideIndex.value + 1; i < slides.value.length; i++) {
    const s = slides.value[i]!;
    if (s.type === "section" || s.type === "ingredients") {
      transitionDirection.value = "slide-left";
      currentSlideIndex.value = i;
      return;
    }
    if (s.type === "step") {
      // Check if this step is still in the same named section
      const nextSection = props.recipe.sections[s.sectionIndex];
      if (nextSection?.name !== current.name) {
        transitionDirection.value = "slide-left";
        currentSlideIndex.value = i;
        return;
      }
    }
  }
  // If nothing found, go to the last slide
  transitionDirection.value = "slide-left";
  currentSlideIndex.value = slides.value.length - 1;
}

const isFirst = computed(() => currentSlideIndex.value === 0);
const isLast = computed(
  () => currentSlideIndex.value === slides.value.length - 1,
);

const currentSlide = computed(() => slides.value[currentSlideIndex.value]!);

// --- Swipe support ---

const contentRef = ref<HTMLElement | null>(null);
const { direction } = useSwipe(contentRef, {
  onSwipeEnd() {
    if (direction.value === "left") goNext();
    if (direction.value === "right") goPrev();
  },
});

// --- Ingredient & cookware data for slides ---

const allIngredients = computed(() =>
  props.recipe
    .getIngredientQuantities({ choices: props.choices })
    .filter((ing) => !ing.flags?.includes("hidden") && ing.usedAsPrimary),
);

const allCookware = computed(() =>
  props.recipe.getCookwareForVariant({ choices: props.choices }),
);

function getStepIngredients(slide: CookSlide & { type: "step" }) {
  return props.recipe
    .getIngredientQuantities({
      step: slide.step,
      choices: props.choices,
    })
    .filter((ing) => !ing.flags?.includes("hidden") && ing.usedAsPrimary);
}

function getStepCookware(slide: CookSlide & { type: "step" }): Cookware[] {
  const section = props.recipe.sections[slide.sectionIndex];
  if (!section) return [];
  const step = section.content.filter((c) => c.type === "step")[
    slide.stepIndexInSection
  ];
  if (!step || step.type !== "step") return [];
  const indices = new Set<number>();
  for (const item of step.items) {
    if (item.type === "cookware") {
      indices.add(item.index);
    }
  }
  return [...indices]
    .map((idx) => props.recipe.cookware[idx])
    .filter((c): c is Cookware => !!c && !c.flags?.includes("hidden"));
}

// --- Timer state management ---

interface TimerState {
  name: string;
  totalSeconds: number;
  remainingSeconds: number;
  status: "idle" | "running" | "paused" | "finished";
  stepNumber: number;
}

interface StepTimerEntry {
  id: string;
  timer: Timer;
}

const timerStates = reactive(new Map<string, TimerState>());
const intervals = new Map<string, ReturnType<typeof setInterval>>();

let notificationApi: ReturnType<typeof useWebNotification> | null = null;

function ensureNotificationPermission() {
  if (!notificationApi) {
    notificationApi = useWebNotification();
  }
  return notificationApi;
}

function durationToSeconds(duration: FixedValue | Range, unit: string): number {
  let raw: number;
  if (duration.type === "fixed") {
    const v = duration.value;
    if (v.type === "decimal") raw = v.decimal;
    else if (v.type === "fraction") raw = v.num / v.den;
    else raw = parseFloat(v.text) || 0;
  } else {
    // Range — use max
    const v = duration.max;
    raw = v.type === "decimal" ? v.decimal : v.num / v.den;
  }
  const u = unit.toLowerCase().replace(/s$/, "");
  if (u === "hour" || u === "hr" || u === "h") return Math.round(raw * 3600);
  if (u === "second" || u === "sec" || u === "s") return Math.round(raw);
  // Default: minutes
  return Math.round(raw * 60);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getStepTimerEntries(
  slide: CookSlide & { type: "step" },
): StepTimerEntry[] {
  const entries: StepTimerEntry[] = [];
  for (const item of slide.step.items) {
    if (item.type === "timer") {
      const timer = props.recipe.timers[item.index];
      if (!timer) continue;
      const id = `${slide.stepNumber}-${item.index}`;
      // Lazily initialize timer state
      if (!timerStates.has(id)) {
        const total = durationToSeconds(timer.duration, timer.unit);
        timerStates.set(id, {
          name:
            timer.name ||
            `Step ${slide.stepNumber} (${formatQuantityWithUnit(timer.duration, timer.unit)})`,
          totalSeconds: total,
          remainingSeconds: total,
          status: "idle",
          stepNumber: slide.stepNumber,
        });
      }
      entries.push({ id, timer });
    }
  }
  return entries;
}

function startTimer(id: string) {
  const state = timerStates.get(id);
  if (!state) return;
  // Request notification permission on first timer start
  const { show: showNotification, isSupported: notificationSupported } =
    ensureNotificationPermission();
  state.status = "running";
  intervals.set(
    id,
    setInterval(() => {
      if (state.remainingSeconds <= 1) {
        state.remainingSeconds = 0;
        state.status = "finished";
        clearInterval(intervals.get(id));
        intervals.delete(id);
        if (notificationSupported.value) {
          showNotification({
            title: "Timer done!",
            body: state.name,
          });
        }
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      } else {
        state.remainingSeconds--;
      }
    }, 1000),
  );
}

function pauseTimer(id: string) {
  const state = timerStates.get(id);
  if (!state) return;
  state.status = "paused";
  clearInterval(intervals.get(id));
  intervals.delete(id);
}

function resetTimer(id: string) {
  const state = timerStates.get(id);
  if (!state) return;
  clearInterval(intervals.get(id));
  intervals.delete(id);
  state.remainingSeconds = state.totalSeconds;
  state.status = "idle";
}

function dismissTimer(id: string) {
  clearInterval(intervals.get(id));
  intervals.delete(id);
  timerStates.delete(id);
}

onUnmounted(() => {
  for (const [, intervalId] of intervals) clearInterval(intervalId);
  intervals.clear();
});

// --- Timer widget state ---

const timerPanelOpen = ref(false);
const timerWidgetRef = ref<HTMLElement | null>(null);

onClickOutside(timerWidgetRef, () => {
  if (timerPanelOpen.value) timerPanelOpen.value = false;
});

const currentStepTimerEntries = computed(() => {
  const slide = currentSlide.value;
  if (slide.type !== "step") return [];
  return getStepTimerEntries(slide);
});

const activeTimers = computed(() => {
  const result: { id: string; state: TimerState }[] = [];
  for (const [id, state] of timerStates) {
    if (
      state.status === "running" ||
      state.status === "paused" ||
      state.status === "finished"
    ) {
      result.push({ id, state });
    }
  }
  return result;
});

const hasAnyFinished = computed(() =>
  activeTimers.value.some((t) => t.state.status === "finished"),
);

const shortestActiveTimer = computed(() => {
  const running = activeTimers.value.filter(
    (t) => t.state.status === "running" || t.state.status === "paused",
  );
  if (running.length === 0) {
    // Show finished timers
    const finished = activeTimers.value.filter(
      (t) => t.state.status === "finished",
    );
    return finished[0] ?? null;
  }
  return running.reduce((a, b) =>
    a.state.remainingSeconds <= b.state.remainingSeconds ? a : b,
  );
});

// Panel shows: current step timers (all states) + active timers from other steps
const panelTimers = computed(() => {
  const currentIds = new Set(currentStepTimerEntries.value.map((e) => e.id));
  const currentStepItems = currentStepTimerEntries.value.map((e) => ({
    id: e.id,
    state: timerStates.get(e.id)!,
  }));
  const otherActiveItems = activeTimers.value.filter(
    (t) => !currentIds.has(t.id),
  );
  return [...currentStepItems, ...otherActiveItems];
});

const showWidget = computed(
  () =>
    currentStepTimerEntries.value.length > 0 || activeTimers.value.length > 0,
);

// Close panel when navigating slides
watch(currentSlideIndex, () => {
  timerPanelOpen.value = false;
});
</script>

<template>
  <UModal
    fullscreen
    :close="{ onClick: () => emit('close') }"
    :ui="{
      content: 'flex flex-col',
      header: 'p-0 min-h-0 border-0',
      body: 'flex-1 flex flex-col overflow-hidden p-0',
      footer: 'p-4 justify-between',
    }"
  >
    <template #header>
      <!-- Progress bar + mobile close button -->
      <div class="flex w-full items-center gap-2 px-4 pt-4 sm:px-6">
        <div class="flex flex-1 gap-1">
          <div
            v-for="i in totalProgressSteps"
            :key="i"
            class="h-1.5 flex-1 rounded-full transition-colors duration-300"
            :class="
              i - 1 <= currentProgressIndex
                ? 'bg-primary'
                : 'bg-neutral-200 dark:bg-neutral-700'
            "
          />
        </div>
        <UButton
          class="-my-1"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Close"
          @click="emit('close')"
        />
      </div>
    </template>

    <template #body>
      <div ref="contentRef" class="relative flex flex-1 overflow-hidden">
        <Transition :name="transitionDirection" mode="out-in">
          <div
            :key="currentSlideIndex"
            class="flex w-full flex-col items-center overflow-y-auto px-4 py-8 sm:px-8 md:px-16"
          >
            <!-- Ingredients slide -->
            <template v-if="currentSlide.type === 'ingredients'">
              <div class="mx-auto w-full max-w-3xl">
                <h2 class="mb-6 text-center text-2xl font-bold md:text-3xl">
                  Ingredients
                </h2>
                <p class="text-muted mb-6 text-center">
                  This recipe requires the following ingredients
                </p>
                <IngredientList
                  :ingredients="allIngredients"
                  :all-ingredients="recipe.ingredients"
                  :interactive="false"
                />
                <template v-if="allCookware.length > 0">
                  <h3 class="mt-8 mb-3 text-xl font-bold">Cookware</h3>
                  <ul class="ml-6 list-disc md:columns-2">
                    <li v-for="item in allCookware" :key="item.name">
                      {{ item.name }}
                      <span v-if="item.quantity" class="text-neutral-500">
                        ({{ formatQuantity(item.quantity) }})
                      </span>
                    </li>
                  </ul>
                </template>
              </div>
            </template>

            <!-- Section title slide -->
            <template v-else-if="currentSlide.type === 'section'">
              <div
                class="flex flex-1 flex-col items-center justify-center gap-6"
              >
                <h2 class="text-center text-3xl font-bold md:text-4xl">
                  {{ currentSlide.name }}
                </h2>
                <UButton
                  v-if="currentSlide.optional"
                  label="Skip section"
                  color="neutral"
                  variant="soft"
                  size="lg"
                  icon="i-lucide-skip-forward"
                  @click="skipSection()"
                />
              </div>
            </template>

            <!-- Step slide -->
            <template v-else-if="currentSlide.type === 'step'">
              <div class="mx-auto w-full max-w-2xl">
                <h2 class="mb-4 text-xl font-semibold md:text-2xl">
                  <span v-if="currentSlide.optional" class="font-normal"
                    >(Optional)
                  </span>
                  Step {{ currentSlide.stepNumber }}
                </h2>

                <!-- Step image -->
                <NuxtImg
                  v-if="currentSlide.stepImage"
                  :src="currentSlide.stepImage"
                  :alt="`Step ${currentSlide.stepNumber} illustration`"
                  sizes="640px md:512px lg:683px xl:853px"
                  loading="lazy"
                  class="mb-4 max-h-72 w-full rounded-lg object-cover"
                />

                <!-- Step-specific ingredients -->
                <div
                  v-if="getStepIngredients(currentSlide).length > 0"
                  class="bg-elevated mb-4 rounded-lg p-4"
                >
                  <h3
                    class="mb-2 text-sm font-semibold tracking-wide uppercase"
                  >
                    Ingredients for this step
                  </h3>
                  <IngredientList
                    :ingredients="getStepIngredients(currentSlide)"
                    :all-ingredients="recipe.ingredients"
                    :interactive="false"
                  />
                </div>

                <!-- Step-specific cookware -->
                <div
                  v-if="getStepCookware(currentSlide).length > 0"
                  class="bg-elevated mb-4 rounded-lg p-4"
                >
                  <h3
                    class="mb-2 text-sm font-semibold tracking-wide uppercase"
                  >
                    Cookware
                  </h3>
                  <ul class="ml-6 list-disc">
                    <li
                      v-for="item in getStepCookware(currentSlide)"
                      :key="item.name"
                    >
                      {{ item.name }}
                      <span v-if="item.quantity" class="text-neutral-500">
                        ({{ formatQuantity(item.quantity) }})
                      </span>
                    </li>
                  </ul>
                </div>

                <!-- Step description -->
                <div class="text-base leading-relaxed">
                  <PreparationItem
                    :step="currentSlide.step"
                    :recipe="recipe"
                    :choices="choices"
                  />
                </div>
              </div>
            </template>

            <!-- Done slide -->
            <template v-else-if="currentSlide.type === 'done'">
              <div
                class="flex flex-1 flex-col items-center justify-center gap-6"
              >
                <UIcon
                  name="i-lucide-circle-check"
                  class="text-primary size-24"
                />
                <h2 class="text-center text-3xl font-bold">Done!</h2>
                <UButton
                  label="Close"
                  color="primary"
                  size="lg"
                  @click="emit('close')"
                />
              </div>
            </template>
          </div>
        </Transition>

        <!-- Timer widget (FAB / pill / panel) -->
        <div
          v-if="showWidget"
          ref="timerWidgetRef"
          class="absolute right-4 bottom-4 z-10 flex items-end gap-2"
        >
          <!-- Slide-in panel -->
          <Transition name="timer-panel">
            <div
              v-if="timerPanelOpen"
              class="bg-elevated w-72 rounded-2xl p-3 shadow-lg"
            >
              <div class="mb-2 flex items-center justify-between">
                <span class="mb-1 ml-1.5 text-base font-semibold">TIMERS</span>
                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="timerPanelOpen = false"
                />
              </div>
              <div class="flex flex-col gap-2">
                <div
                  v-for="{ id, state } in panelTimers"
                  :key="id"
                  class="flex items-center gap-2 rounded-xl px-2 transition-colors"
                  :class="{
                    'bg-warning/10 animate-pulse': state.status === 'finished',
                  }"
                >
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-xs">
                      {{ state.name }}
                    </div>
                    <div
                      class="font-mono text-lg font-bold"
                      :class="{
                        'text-warning': state.status === 'finished',
                        'text-teal-600 dark:text-teal-400':
                          state.status === 'running',
                      }"
                    >
                      {{ formatTime(state.remainingSeconds) }}
                    </div>
                  </div>
                  <div class="flex gap-1">
                    <UButton
                      v-if="
                        state.status === 'idle' || state.status === 'paused'
                      "
                      icon="i-lucide-play"
                      color="primary"
                      variant="soft"
                      size="xs"
                      class="rounded-full"
                      @click="startTimer(id)"
                    />
                    <UButton
                      v-if="state.status === 'running'"
                      icon="i-lucide-pause"
                      color="neutral"
                      variant="soft"
                      size="xs"
                      class="rounded-full"
                      @click="pauseTimer(id)"
                    />
                    <UButton
                      v-if="
                        state.status === 'paused' || state.status === 'finished'
                      "
                      icon="i-lucide-rotate-ccw"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      class="rounded-full"
                      @click="resetTimer(id)"
                    />
                    <UButton
                      v-if="state.status === 'finished'"
                      icon="i-lucide-x"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      class="rounded-full"
                      @click="dismissTimer(id)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Transition>

          <!-- FAB / Pill button -->
          <button
            class="flex items-center gap-2 rounded-full shadow-lg transition-all duration-300"
            :class="[
              activeTimers.length > 0
                ? hasAnyFinished
                  ? 'bg-warning text-warning-contrast animate-pulse px-4 py-3'
                  : 'bg-teal-600 px-4 py-3 text-white dark:bg-teal-500'
                : 'bg-teal-600 p-3 text-white dark:bg-teal-500',
            ]"
            @click="timerPanelOpen = !timerPanelOpen"
          >
            <UIcon name="i-lucide-timer" class="size-5 shrink-0" />
            <span
              v-if="activeTimers.length > 0 && shortestActiveTimer"
              class="translate-y-[2px] font-mono text-sm font-bold whitespace-nowrap"
            >
              {{ formatTime(shortestActiveTimer.state.remainingSeconds) }}
            </span>
          </button>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        icon="i-lucide-chevron-left"
        color="neutral"
        variant="soft"
        size="lg"
        :disabled="isFirst"
        class="rounded-full"
        @click="goPrev()"
      />
      <span class="text-muted text-sm">
        {{ currentProgressIndex + 1 }} / {{ totalProgressSteps }}
      </span>
      <UButton
        v-if="!isLast"
        icon="i-lucide-chevron-right"
        color="neutral"
        variant="soft"
        size="lg"
        class="rounded-full"
        @click="goNext()"
      />
      <div v-else class="size-10" />
    </template>
  </UModal>
</template>

<style scoped>
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.slide-left-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-right-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}
.slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.timer-panel-enter-active,
.timer-panel-leave-active {
  transition:
    transform 0.25s ease,
    opacity 0.25s ease;
  transform-origin: bottom right;
}

.timer-panel-enter-from,
.timer-panel-leave-to {
  transform: scale(0.9) translateX(10%);
  opacity: 0;
}
</style>
