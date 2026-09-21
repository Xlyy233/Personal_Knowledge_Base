import { createRouter, createWebHistory } from 'vue-router';
import HomeView from './views/HomeView.vue';
import NoteDetail from './views/NoteDetail.vue';
import NoteEdit from './views/NoteEdit.vue';
import GraphPage from './views/GraphPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/note/:id', name: 'detail', component: NoteDetail },
    { path: '/edit/:id?', name: 'edit', component: NoteEdit },
    { path: '/graph', name: 'graph', component: GraphPage },
  ],
  scrollBehavior(to, from, saved) {
    return saved || { top: 0 };
  },
});
