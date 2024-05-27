<template>
  <div class="flex flex-col">
    <div class="flex flex-row items-center ml-2 mb-2 pr-2">
      <span class="mr-2">请选择岗位</span>
      <el-select class="flex-1" v-model="position" placeholder="请选择...">
        <el-option
            v-for="item in positions"
            :key="item.value"
            :label="item.label"
            :value="item.value"/>
      </el-select>
    </div>
    <div class="flex flex-col items-start ml-2 mb-2 pr-2">
      <span class="mr-2 mb-1">请输入开发任务描述：</span>
      <el-input class="flex-1" type="textarea" placeholder="请输入..." :rows="5" v-model="description"/>
    </div>
    <div class="flex flex-row items-center ml-2 mb-2 pr-2">
      <el-button type="primary" class="w-full" @click="callAgent">开始生成</el-button>
    </div>
    <template v-if="missionArr.length">
      <div class="flex flex-col items-start ml-2 mb-2 pr-2">
        <el-checkbox
            v-model="checkAll"
            :indeterminate="isIndeterminate"
            @change="handleCheckAllChange"
        >
          全选
        </el-checkbox>
        <el-checkbox-group
            v-model="checkedMission"
            @change="handleCheckedMissionChange"
        >
          <el-checkbox v-for="mission in missionArr" :key="mission" :label="mission" :value="mission">
            {{ mission }}
          </el-checkbox>
        </el-checkbox-group>
      </div>
      <div class="flex flex-row items-center ml-2 mb-2 pr-2">
        <el-button type="success" class="w-full" @click="doAction">导入任务至甘特图！</el-button>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
import {onMounted, onUnmounted, reactive, ref} from "vue";
import {bitable, IGridView} from "@lark-base-open/js-sdk";
import {ElLoading, ElMessage} from "element-plus";
import 'element-plus/es/components/message/style/css'
import {deepSeekChat} from "./deepseek.ts";

let onSelectionChangeHandler: any = null;
const tableFieldMetaList = ref<Array<any>>([])
const visibleRecordIdList = ref<Array<any>>([])
const currentRecordId = ref<string>("")
const currentViewId = ref<string>("")
const isLoading = ref(false)
const lastRecordId = ref("");

const position = ref(0);
const description = ref("");
const positions = reactive([
  {label: '前端', value: 0, stage: '页面开发、接口联调'},
  {label: '后端', value: 1, stage: '接口开发、接口联调'},
  {label: '测试', value: 2, stage: '第一轮测试、第二轮测试、第三轮测试'},
  {label: '产品', value: 3, stage: '需求对齐'},
  {label: 'UI', value: 4, stage: 'UI制图、UI复查'},
  {label: '其它', value: 5, stage: '无子任务阶段'},
])
let isGenerating: any = null;
const onSelectionChange = async (event: any) => {
  const table = await bitable.base.getActiveTable();
  isLoading.value = true;
  try {
    currentViewId.value = event?.data?.viewId ?? '';
    const view = await table.getViewById(currentViewId.value) as IGridView;
    visibleRecordIdList.value = await view.getVisibleRecordIdList();
    const recordId = event?.data?.recordId ?? '';
    currentRecordId.value = recordId;
    if (lastRecordId.value == recordId && !event?.data?.refresh) {
      return;
    } else if (recordId) {
      lastRecordId.value = recordId;
    } else {
      lastRecordId.value = recordId;
    }
  } catch (e) {
  } finally {
    isLoading.value = false;
  }
}
onMounted(async () => {
  const table = await bitable.base.getActiveTable();
  onSelectionChangeHandler = bitable.base.onSelectionChange(onSelectionChange)
  // 获取列的列表
  tableFieldMetaList.value = await table.getFieldMetaList()
})

const checkAll = ref(false)
const isIndeterminate = ref(true)
const missionArr = ref([])
const checkedMission = ref([])

const handleCheckAllChange = (val: boolean) => {
  checkedMission.value = val ? missionArr.value : []
  isIndeterminate.value = false
}
const handleCheckedMissionChange = (value: string[]) => {
  const checkedCount = value.length
  checkAll.value = checkedCount === missionArr.value.length
  isIndeterminate.value = checkedCount > 0 && checkedCount < missionArr.value.length
}

const callAgent = () => {
  if (!description.value) {
    ElMessage.error("请输入开发任务描述")
  } else {
    isGenerating = ElLoading.service()
    missionArr.value = [];
    checkedMission.value = [];
    checkAll.value = false;
    isIndeterminate.value = true;
    const positionData: any = positions.find(obj => obj.value === position.value)
    const promptTemplate = [
      '请注意在回答中一定不要输出markdown格式的相关文字，如```json.',
      `你是一名${positionData.label}工程师。你将要执行如下软件开发任务：`,
      description.value,
      `你的工作阶段是：${positionData.stage}`,
      '请将这些任务拆解，并返回形如以下格式的JSON：',
      `['【${positionData.label}】任务名-工作阶段', '【${positionData.label}任务名-工作阶段'...]`
    ]
    deepSeekChat(promptTemplate.join("\n")).then(res => {
      try {
        missionArr.value = JSON.parse(res.data.choices[0].message.content)
      } catch (e) {
        ElMessage.error("AI生成错误，请重试！")
      }
    }).catch(err => {
      ElMessage.error("AI生成错误，请重试！" + err)
    }).finally(() => {
      isGenerating.close();
    })
  }
}

const doAction = async () => {
  const table = await bitable.base.getActiveTable();
  const view = await table.getActiveView()
  const viewType = await view.getType();
  if (viewType != 1) {
    // 项目总表为1，甘特图为5
    ElMessage.error("当前焦点视图不是项目总表")
  } else {
    const toAddArr: any = []
    checkedMission.value.forEach((title: string) => {
      let tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const toFillFields: any = {
        '设计项目': title,
        '开始日期': new Date().getTime(),
        '结束日期': tomorrow.getTime(),
        '工时': 8.0,
      }
      const missionRecord = Object.keys(toFillFields).map((fieldName: any) => {
        const toEditField = tableFieldMetaList.value.find(field => fieldName == field.name);
        return {
          value: toFillFields[fieldName],
          id: toEditField.id,
          type: toEditField.type,
          name: toEditField.name,
        }
      })
      const toAdd: any = {};
      missionRecord.forEach(obj => toAdd[obj.id] = obj.value)
      toAddArr.push({
        fields: toAdd
      })
    })
    table.addRecords(toAddArr).then(() => {
      ElMessage.success("导入成功！")
    })
  }
}

onUnmounted(() => {
  if (onSelectionChangeHandler) {
    onSelectionChangeHandler = null;
  }
})
</script>
<style scoped>
:deep(.is-active) {
  transition: none;
}

:deep(.is-animating) {
  transition: none;
}
</style>
