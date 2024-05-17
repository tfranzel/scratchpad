<script setup lang="ts">

import MainContainer from "@/components/MainContainer.vue";
import {useConnectionStore} from "@/stores/connection";
import {ref, watch} from "vue";
import {generateKeyMnemonic} from "@/crypto";
import {useRouter} from "vue-router";

const connectionStore = useConnectionStore();
const router = useRouter();

const mnemonic = ref<string[]>([]);
const mnemonicToggle = ref<boolean>(false);

watch(
    () => [connectionStore.key, mnemonicToggle.value],
    async () => {
      if (connectionStore.key === null) {
        mnemonic.value = [];
      } else {
        const tmp = await generateKeyMnemonic(connectionStore.key);
        mnemonic.value = mnemonicToggle.value ? tmp : tmp.slice(0,8);
      }
    },
    { immediate: true }
)

const selectConnection = (event: any) => {
  console.log("Changing connection context ...")
  connectionStore.changeConnection(event.target.value === "-" ? null : event.target.value);
}

const remove = () => {
  connectionStore.remove();
  router.push("start");
}

const add = () => {
  connectionStore.changeConnection(null);
  router.push("start");
}

const copyToClipboard = () => {
  navigator.clipboard.writeText(connectionStore.currentConnection || "");
}

</script>

<template>
  <MainContainer>
    <div class="container">
      <div class="row justify-content-center mt-5">
        <div class="col-12 text-center">
          <h4>Connection ID</h4>
        </div>
        <div class="col-12 col-md-6 text-center mt-2 d-flex">
          <select @input="selectConnection" class="form-select text-center" aria-label="Connection selector">
            <option v-for="c in ['-', ...connectionStore.connections]"
                    :value="c"
                    :disabled="c === '-'"
                    :selected="c === (connectionStore.currentConnection || '-')">
              {{ c }}
            </option>
          </select>
          <button type="button" class="btn btn-outline-secondary ms-2" @click="copyToClipboard">
            <i class="bi bi-copy"></i>
          </button>
          <button type="button" class="btn btn-outline-secondary ms-2" @click="add">
            <i class="bi bi-plus"></i>
          </button>
        </div>
        <div class="col-12 text-center mt-5">
          <h4>Key Fingerprint</h4>
        </div>
        <div class="col-12 col-md-6 text-center mt-2">
          <span class="badge rounded-pill text-bg-warning fs-5 m-1" v-for="word in mnemonic">
            {{ word }}
          </span>
          <span @click="mnemonicToggle = !mnemonicToggle" class="badge rounded-pill text-bg-secondary fs-5 m-1">
            {{ mnemonicToggle ? "hide" : "..." }}
          </span>
        </div>
        <div class="col-12 text-center mt-5">
          <button @click="remove" type="button" class="btn btn-danger">
            <i class="bi bi-x-octagon"></i> Remove connection
          </button>
        </div>
      </div>
    </div>
  </MainContainer>
</template>

<style scoped>

</style>
