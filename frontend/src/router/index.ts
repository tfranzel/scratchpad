import {createRouter, createWebHistory, type RouteLocationGeneric} from 'vue-router'
import EditorView from '@/views/EditorView.vue'
import FileView from "@/views/FilesView.vue";
import StartView from "@/views/StartView.vue";
import SettingsView from "@/views/SettingsView.vue";
import {useConnectionStore} from "@/stores/connection";

function guard(route: RouteLocationGeneric) {
    const connectionStore = useConnectionStore();

    if (route.name === "settings") {
        // nothing to select - go to start
        if (connectionStore.connections.length === 0) {
            return {name: 'start'}
        }
        return true;
    } else if (route.name === "home" || route.name === "files") {
        if (connectionStore.currentConnection === null || connectionStore.key === null) {
            return {name: 'settings'}
        }
        return true;
    } else if (route.name === "start") {
        if (connectionStore.currentConnection !== null) {
            return {name: 'settings'}
        }
        return true;
    } else {
        return false;
    }
}

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: EditorView,
            beforeEnter: guard
        },
        {
            path: '/files',
            name: 'files',
            component: FileView,
            beforeEnter: guard
        },
        {
            path: '/settings',
            name: 'settings',
            component: SettingsView,
            beforeEnter: guard
        },
        {
            path: '/start',
            name: 'start',
            component: StartView,
            beforeEnter: guard
        },
    ]
})

export default router
