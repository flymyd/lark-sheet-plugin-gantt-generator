# 飞书多维表格插件-甘特图任务生成器

## 功能

* 支持前端、后端、测试、产品、UI等岗位的任务分解
* 输入模糊的任务描述，自动分解工作任务并填到甘特图内

## LLM API配置

该插件默认使用`deepseek-chat`作为AI能力的提供商。  
在`src/deepseek.ts`中的`DEEPSEEK_API_KEY`常量处填上你的API KEY即可，请注意保护隐私。

## 定制

* `positions`对象定义了各岗位的工作阶段
* `doAction`函数中的`viewType`判断用于验证当前视图是总表还是甘特图。请根据实际情况调整
* `toFillFields`为默认填充模板

## 部署

```shell
npm i
npm run build
```

并部署dist至已配置HTTPS的站点下即可。
