<template lang="pug">
v-card(class="mb-4" v-if="accounts.length > 0")
  v-card-title {{ title }}
  v-list(density="compact")
    v-list-item(
      v-for="account in accounts"
      :key="account.id"
      :title="account.type"
      :subtitle="account.oauthData.email"
    )
      template(v-slot:prepend)
        div.position-relative.d-flex.align-center
          div.account-indicator(:style="{ backgroundColor: getAccountColor(account) }")
          v-avatar(size="32" :color="getAccountColor(account)" class="ml-2")
            span {{ getInitialsFromString(account.name) }}
      
      template(v-slot:append)
        div.d-flex.align-center
          v-switch(
            :model-value="isAccountSelected(account.id)"
            @update:model-value="(val) => toggleAccount(account.id, val)"
            :color="getAccountColor(account)"
            hide-details
            density="compact"
            class="mr-2"
          )
          slot(name="account-chip" :account="account")
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { IntegrationAccount } from '~/types/models'

const props = defineProps({
  accounts: {
    type: Array as () => IntegrationAccount[],
    required: true
  },
  modelValue: {
    type: Array as () => string[],
    required: true
  },
  title: {
    type: String,
    default: 'Accounts'
  }
})

const emit = defineEmits(['update:modelValue'])

const getInitialsFromString = (name: string) => {
  if (!name) return ''
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`
  }
  return name.substring(0, 2).toUpperCase()
}

const getAccountColor = (account: IntegrationAccount) => {
  if (account.color) return account.color
  
  // Generate deterministic color based on account ID
  let hash = 0
  const id = account.id
  for (let i = 0; i < id.length; i++) {
    // Simple hash calculation for TypeScript compatibility
    hash = Math.imul(hash, 31) + id.charCodeAt(i)
  }
  
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 70%, 60%)`
}

// Methods for handling provider selection
const isAccountSelected = (accountId: string) => {
  return props.modelValue.includes(accountId)
}

// Direct toggle function
const toggleAccount = (accountId: string, checked: boolean) => {
  const newValue = [...props.modelValue]
  
  if (checked && !newValue.includes(accountId)) {
    // Add to selected
    newValue.push(accountId)
  } else if (!checked && newValue.includes(accountId)) {
    // Remove from selected
    const index = newValue.indexOf(accountId)
    if (index !== -1) {
      newValue.splice(index, 1)
    }
  }
  
  // Emit the updated array
  emit('update:modelValue', newValue)
}

</script>

<style>
.account-indicator {
  position: absolute;
  left: 0;
  height: 100%;
  width: 4px;
  border-radius: 2px 0 0 2px;
}
</style>
