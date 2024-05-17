<script setup lang="ts">
import Dropzone from "dropzone";
import {onMounted, ref} from "vue";
import MainContainer from "@/components/MainContainer.vue";
import {type FileContainer, useScratchStore} from "@/stores/scratchpad";
import FileSaver from "file-saver";

const scratchStore = useScratchStore();
const dropzoneRef = ref<HTMLElement>();

onMounted(() => {
  const dropzone = new Dropzone(dropzoneRef.value!, {
    maxFilesize: 200, // MB
    uploadMultiple: true,
    autoProcessQueue: false,
  });
  dropzone.on("addedfile", (file) => {
      const reader = new FileReader();
      reader.onload = function (event) {
        scratchStore.addFile({
          name: file.name,
          size: file.size,
          type: file.type,
          data: event.target?.result as string,  // base64 string
        });
      };
      reader.readAsDataURL(file);
  });
});

function downloadFile(file: FileContainer) {
  FileSaver.saveAs(file.data, file.name);
}

</script>

<template>
  <MainContainer>
    <div class="container-sm">
      <form action="/target" ref="dropzoneRef" class="dropzone m-3"></form>
      <table class="table table-hover align-middle ">
        <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Type</th>
          <th scope="col">Size</th>
          <th scope="col">Action</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="(file, index) in scratchStore.files" :key="file.name">
          <th scope="row" style="width: 50%">{{ file.name }}</th>
          <td style="width: 15%">{{ file.type }}</td>
          <td style="width: 15%">{{ Math.round(file.size / 1024) }} KB</td>
          <td class="justify-content-end" style="max-width: 20%">
            <button @click="downloadFile(file)" type="button" class="btn btn-sm btn-outline-success me-3 mb-2 mb-md-0">Download</button>
            <button @click="scratchStore.deleteFile(index)" type="button" class="btn btn-sm btn-outline-danger">Delete</button>
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </MainContainer>
</template>

<style>
@import "dropzone/dist/dropzone.css";
</style>
