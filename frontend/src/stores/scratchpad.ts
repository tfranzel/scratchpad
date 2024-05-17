import {defineStore} from 'pinia'
import {useConnectionStore} from "@/stores/connection";

export interface FileContainer {
    name: string;
    size: number;
    type: string;
    data: string;
}

export const useScratchStore = defineStore('scratchpad', {
    state: () => (
        {
            editor: {
                dirty: false,
                lastChange: 0,
                source: "local" as "local" | "remote",
                text: "",
            },
            files: [] as FileContainer[],
            notified: false,
        }
    ),
    getters: {},
    actions: {
        init() {
            // this.editor = loadValue("lastEditorState")
            // this.files = loadValue("lastFilesState") || [];
        },
        reset() {
            this.editor = {dirty: false, lastChange: 0, source: "local", text: ""};
            this.files = [];
        },
        async check() {
            // periodic check that pushed text changes to server in a non-spammy way.
            if (this.editor.dirty && (Date.now() - this.editor.lastChange) > 1000) {
                this.editor.dirty = !await useConnectionStore().pushText(
                    {text: this.editor.text, ts: this.editor.lastChange}
                );
            }
        },
        localTextChange(text: string) {
            this.editor = {
                dirty: true,
                lastChange: Date.now(),
                text: text,
                source: "local",
            };
        },
        remoteTextChange(text: string, ts: number) {
            this.editor = {
                dirty: false,
                lastChange: ts,
                text: text,
                source: "remote",
            };
        },
        deleteFile(index: number) {
            this.files.splice(index, 1);
            useConnectionStore().pushFiles(this.files);
        },
        addFile(file: FileContainer) {
            this.files.push(file);
            useConnectionStore().pushFiles(this.files);
        }
    },
})
