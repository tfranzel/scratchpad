<script setup lang="ts">
import {onBeforeMount, ref, watchEffect} from "vue";
import {useRoute, useRouter} from "vue-router";
import {getBase, sleep} from "@/util";
import {type Connection, useConnectionStore} from "@/stores/connection";
import {isLocalPublicKey} from "@/crypto";

const connectionId = ref<string>("");
const inputEnabled = ref<boolean>(true);
const valid = ref<boolean | null>();
const waiting = ref<boolean>(false);
const waitingText = ref<string>("");
const connectionStore = useConnectionStore();
const router = useRouter();

onBeforeMount(() => {
  connectionId.value = String(useRoute().query["id"] || connectionStore.currentConnection || "");
});

watchEffect(() => {
  if (connectionStore.key) {
    router.push("/");
  }
})

const feedback = async (text: string, valid_: boolean, reset: boolean) => {
  valid.value = valid_;
  await sleep(1000);
  waiting.value = true;
  waitingText.value = text;
  await sleep(2000);
  if (reset) {
    waiting.value = false;
    inputEnabled.value = true;
    connectionId.value = ""
    valid.value = null;
  }
}

watchEffect(async () => {
  // uuid has to be complete for proceeding
  if (connectionId.value.length < 36) {
    return;
  }
  // disable input for now.
  inputEnabled.value = false;
  // check if server has that id on file
  const response = await fetch(getBase("http") + "/api/connections/" + connectionId.value);

  if (!response.ok) {
    await feedback("Invalid", false, true);
  } else {
    const conn: Connection = await response.json()

    if (conn.a === null || conn.b === null || await isLocalPublicKey(conn.a) || await isLocalPublicKey(conn.b)) {
      const newConnection = connectionId.value;
      await feedback(conn.a && conn.b ? "Connecting ..." : "Waiting for other party ...", true, false);
      await connectionStore.changeConnection(newConnection);
    } else {
      await feedback("Given ID already has two other parties", true,true);
    }
  }
});

</script>

<template>
  <div class="d-flex min-vh-100 align-items-center">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-6 text-center">
          <i class="bi bi-feather logo"></i>
          <h1 class="mb-5 unselectable">Scratchpad</h1>
          <div class="input-container" v-if="!waiting">
            <input v-model.trim="connectionId" type="text" placeholder="Invite code" aria-label="invite code"
                   class="form-control form-control-lg text-center mt-5"
                   :class="{'is-valid': valid === true, 'is-invalid': valid === false}"
                   :disabled="!inputEnabled">
          </div>
          <div class="input-container" v-if="waiting">
            <div class="spinner-border text-muted loading-spinner" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <div class="text-muted mt-2 unselectable">{{ waitingText }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

.logo {
  font-size: 8rem;
}

.loading-spinner {
  width: 5rem;
  height: 5rem;
}

.input-container {
  height: 5rem;
}

.unselectable {
  user-select: none;
}

</style>
