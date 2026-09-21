<script setup>
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import { store, refreshMeta } from './store';
import SideBar from './components/SideBar.vue';

const route = useRoute();
refreshMeta();

// 路由切换时收起移动端抽屉
watch(() => route.fullPath, () => { store.sidebarOpen = false; });
</script>

<template>
  <div class="layout">
    <!-- 移动端顶栏 -->
    <div class="mobile-bar">
      <button class="btn-icon" style="font-size:19px;padding:2px 8px;" @click="store.sidebarOpen = !store.sidebarOpen">☰</button>
      <span style="font-weight:600;font-size:15px;">知识库</span>
      <span style="flex:1"></span>
      <router-link to="/edit" style="font-size:20px;color:var(--accent);text-decoration:none;padding:0 8px;">＋</router-link>
    </div>

    <!-- 移动端抽屉遮罩 -->
    <transition name="fade">
      <div class="sidebar-mask" v-if="store.sidebarOpen" @click="store.sidebarOpen = false"></div>
    </transition>

    <SideBar :class="{ open: store.sidebarOpen }" />

    <div class="main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
  </div>
</template>
