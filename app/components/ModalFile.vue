<script setup lang="ts">
import type { TreeItem } from "@nuxt/ui";
import * as v from "valibot";
import type { NuxtError } from "#app";

//--------------------
// Component basics
//--------------------

const { $ts } = useI18n();

const props = defineProps<{
  mode: "new" | "move" | "move-folder";
  currentPath?: string;
  title?: string;
  excludePaths?: string[];
}>();

const mode = props.mode;
const currentPath = props.currentPath ?? "";
const title = computed(() => props.title ?? $ts("recipe.untitled"));
const excludePaths = props.excludePaths ?? [];
const emit = defineEmits<{ close: [{ dir: string; name: string } | false] }>();
defineShortcuts({
  escape: () => emit("close", false),
});
const toast = useToast();

//--------------------
// Directory tree
//--------------------

const { data: directoriesFromApi } = await useFetch<string[]>(
  "/api/recipes/directory",
);

function buildTree(
  paths: string[] | undefined,
  exclude: string[] = [],
): TreeItem[] {
  const tree: TreeItem[] = [];
  if (!paths) {
    return [];
  }

  const filtered = exclude.length
    ? paths.filter(
        (p) => !exclude.some((ex) => p === ex || p.startsWith(ex + "/")),
      )
    : paths;

  for (const path of filtered) {
    const parts = path.split("/");
    let level = tree;
    for (const part of parts) {
      let node = level.find((n) => n.label === part);
      if (!node) {
        node = { label: part, children: [], path };
        level.push(node);
      }
      if (!node.children) node.children = [];

      level = node.children;
    }
  }
  return [{ label: "/", children: tree, defaultExpanded: true, path: "" }];
}

const items = ref<TreeItem[]>(
  buildTree(directoriesFromApi.value, excludePaths),
);

//--------------------
// Strings
//--------------------

const findRecursive = (
  items: TreeItem[],
  path: string,
): TreeItem | undefined => {
  for (const item of items) {
    if (item.path === path) {
      return item;
    }
    if (item.children) {
      const found = findRecursive(item.children, path);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
};

const baseDir =
  mode === "new" ? currentPath : currentPath?.split("/").slice(0, -1).join("/");

const modalTitle =
  mode === "move"
    ? $ts("modal.file.moveRecipe")
    : mode === "move-folder"
      ? $ts("modal.file.moveFolder")
      : $ts("actions.newRecipe");

const isMoveFolderMode = mode === "move-folder";

//--------------------
// Form validation
//--------------------

const mainSchema = v.object({
  dir: v.nonOptional(v.unknown(), $ts("validation.selectDirectory")),
  fileName: isMoveFolderMode
    ? v.optional(v.string())
    : v.pipe(
        v.string(),
        v.trim(),
        v.nonEmpty($ts("validation.enterFilename")),
        v.excludes("/", $ts("validation.filenameNoSlash")),
        v.check((value) => {
          try {
            validateRecipePath(value);
            return true;
          } catch {
            return false;
          }
        }, $ts("validation.filenameChars")),
      ),
});

interface MainState {
  dir: TreeItem | undefined;
  fileName: string | undefined;
}

const mainState = ref<MainState>({
  dir: findRecursive(items.value as TreeItem[], baseDir),
  fileName:
    isMoveFolderMode || mode === "new"
      ? ""
      : currentPath !== undefined
        ? currentPath.split("/").pop()
        : $ts("recipe.untitled"),
});

const isNotAlreadyExisting = (value: string): boolean => {
  if (!value) return false;
  if (!mainState.value.dir) return false;
  if (!mainState.value.dir.children) return false;
  return findRecursive(mainState.value.dir.children, value) ? false : true;
};

const isParentDirSelected = (value: string): boolean => {
  if (!value) return false;
  return mainState.value.dir ? true : false;
};

const newDirSchema = v.object({
  subDir: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty($ts("validation.enterSubdirName")),
    v.excludes("/", $ts("validation.subdirNoSlash")),
    v.check((value) => {
      try {
        validateRecipePath(value);
        return true;
      } catch {
        return false;
      }
    }, $ts("validation.filenameChars")),
    v.check(isParentDirSelected, $ts("validation.selectParentDir")),
    v.check(isNotAlreadyExisting, $ts("validation.subdirExists")),
  ),
});

const newDirState = reactive({ subDir: "" });

//-------------------------
// Save / return function
//-------------------------

const mainForm = useTemplateRef("mainForm");
const newDirForm = useTemplateRef("newDirForm");

const maybeRevalidateNewDirForm = async () => {
  if (newDirForm.value && newDirForm.value.errors.length > 0) {
    await newDirForm.value.validate({ silent: true });
  }
};

const pendingSubDirCreate = ref(false);
const recipeStore = useRecipeStore();

const createSubDir = async () => {
  pendingSubDirCreate.value = true;
  try {
    const data = await $fetchWithHeaders<{ renamed: boolean; name: string }>(
      "/api/recipes/directory/subdir",
      {
        method: "POST",
        body: {
          parentDir: mainState.value.dir!.path,
          name: newDirState.subDir,
        },
      },
    );
    if (data) {
      // Update tree
      const newPath = pathJoin(mainState.value.dir!.path, data.name);

      const newNode: TreeItem = {
        label: data.name,
        children: [],
        path: newPath,
      };

      // Ensure children array exists before pushing
      if (!mainState.value.dir!.children) {
        mainState.value.dir!.children = [];
      }

      mainState.value.dir!.children.push(newNode);
      mainState.value.dir!.children.sort((a, b) =>
        a.label!.localeCompare(b.label!),
      );

      // Wait for the UI to update with the new node
      await nextTick();

      // Set the new node as the current selection
      mainState.value.dir = newNode;

      // Sync new directory into the recipe store
      if (!recipeStore.directories.includes(newPath)) {
        recipeStore.directories = [...recipeStore.directories, newPath].sort(
          (a, b) => a.localeCompare(b),
        );
      }

      if (!data.renamed) {
        toast.add({
          title: $ts("modal.file.subdirCreated"),
          color: "success",
        });
      } else {
        toast.add({
          title: $ts("modal.file.subdirExistsWarning", {
            name: newDirState.subDir,
          }),
          description: $ts("modal.file.subdirCreatedAs", {
            newName: data.name,
          }),
          color: "warning",
        });
      }
      newDirState.subDir = "";
    }
  } catch (e) {
    toast.add({
      title: $ts("toast.error"),
      description: (e as NuxtError).statusText,
      color: "error",
    });
  } finally {
    pendingSubDirCreate.value = false;
  }
};

const save = async () => {
  try {
    const fieldsToValidate = isMoveFolderMode
      ? (["dir"] as const)
      : (["dir", "fileName"] as const);
    await mainForm.value?.validate({ name: [...fieldsToValidate] });
    emit("close", {
      dir: mainState.value.dir!.path,
      name: mainState.value.fileName || "",
    });
  } catch {
    return;
  }
};
</script>

<template>
  <UModal
    :close="{ onClick: () => emit('close', false) }"
    :title="modalTitle"
    :description="
      mode === 'move'
        ? currentPath
          ? `Move recipe '${title}'`
          : undefined
        : mode === 'move-folder'
          ? `Move folder '${title}'`
          : undefined
    "
    :state="mainState"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UForm ref="mainForm" :schema="mainSchema" :state="mainState">
        <UFormField
          :label="$ts('modal.file.directory')"
          class="mb-4"
          name="dir"
          :required="true"
        >
          <UTree
            v-model="mainState.dir"
            :items="items"
            :get-key="(item) => item.path"
            @update:model-value="maybeRevalidateNewDirForm"
          />
        </UFormField>
        <div class="ml-10">
          <UForm
            ref="newDirForm"
            :schema="newDirSchema"
            :state="newDirState"
            class="flex flex-row gap-2"
            @submit="createSubDir"
          >
            <UFormField
              :label="$ts('modal.file.createSubdir')"
              name="subDir"
              :ui="{ root: 'grow', label: 'text-gray-500' }"
            >
              <UInput v-model="newDirState.subDir" :ui="{ root: 'w-full' }" />
            </UFormField>
            <UButton
              class="mt-6"
              icon="prime:folder-plus"
              color="secondary"
              type="submit"
              :loading="pendingSubDirCreate"
            />
          </UForm>
        </div>
        <template v-if="!isMoveFolderMode">
          <USeparator class="my-2 h-px" />
          <UFormField
            :label="$ts('modal.file.name')"
            name="fileName"
            :required="true"
          >
            <div class="flex flex-row">
              <UInput
                v-model="mainState.fileName"
                :ui="{ root: 'grow' }"
                :placeholder="$ts('recipe.untitled')"
                @keydown.enter.prevent="save"
              />
              <div class="mt-2 ml-1">.cook</div>
            </div>
          </UFormField>
        </template>
      </UForm>
    </template>
    <template #footer>
      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :label="$ts('actions.cancel')"
          @click="emit('close', false)"
        />
        <UButton color="primary" :label="$ts('actions.save')" @click="save" />
      </div>
    </template>
  </UModal>
</template>
