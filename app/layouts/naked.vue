<template>
  <UContainer
    class="absolute flex min-h-screen items-center justify-center"
    :ui="{
      base: 'max-w-none',
    }"
  >
    <slot />
  </UContainer>
</template>
