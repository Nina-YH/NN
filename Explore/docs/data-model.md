# 数据模型（Data Model）

所有数据存于 localStorage，key = `neon_self_discipline_v1`，值为一个 JSON 对象：

```json
{
  "version": 1,
  "sleep": {
    "2026-10-09": { "bed": "23:15", "wake": "07:30" }
  },
  "todos": [
    { "id": "uuid-1", "text": "喝水", "done": true, "createdDate": "2026-10-09", "doneDate": "2026-10-09" },
    { "id": "uuid-2", "text": "读书 30 分钟", "done": false, "createdDate": "2026-10-09", "doneDate": null }
  ],
  "explorations": [
    {
      "id": "uuid-e1",
      "name": "学吉他",
      "goal": "试试自己喜不喜欢",
      "startDate": "2026-10-01",
      "status": "active",
      "endDate": null,
      "checkins": {
        "2026-10-02": { "engaged": true, "note": "今天练了 20 分钟" }
      },
      "review": "",
      "conclusion": ""
    }
  ],
  "settings": {
    "userName": ""
  }
}
```

## 字段说明
- `sleep`：以日期 `YYYY-MM-DD` 为 key，值含 `bed`（入睡）和 `wake`（起床），时间格式 `HH:MM`。
- `todos`：扁平数组，每项 `{ id, text, done, createdDate, doneDate }`。
  - 未完成（done=false）的事项跨天自动保留，直到被完成；
  - 完成后记录 doneDate，次日不再显示（作为历史，供统计使用）。
- `explorations`：数组，每项含：
  - `status`：`"active"`（进行中）或 `"ended"`（已结束）。
  - `checkins`：以日期为 key 的每日记录，`engaged` 是否投入、`note` 当日心得/进展（自由文本，可长可短）。
  - `review` / `conclusion`：结束时的复盘与结论。
- `settings`：全局设置（预留）。

## 派生数据（不存储，用时计算）
- 睡眠时长 = `wake - bed`（跨天即 +24h）。
- 连续坚持天数 = 从今天向前数「当天有记录睡眠 或 清单完成 ≥1」的连续天数。
- 完成率 = 某范围内已完成项 / 总项。

## 约定
- 日期一律用本地时区 `YYYY-MM-DD`，避免 UTC 偏移造成跨天错误。
- 新增字段须向后兼容：读取时用默认值兜底。
