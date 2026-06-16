import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  buildExportCsv,
  buildExportFilename,
  buildExportJson,
  downloadTextFile,
  fetchExportData,
  getExportDateRange,
} from '../lib/exportData'
import type { ExportRangeKey } from '../lib/exportData'

const exportRangeOptions: ExportRangeKey[] = ['7d', '30d', 'all']

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '导出失败'
}

function ExportPage() {
  const [selectedRange, setSelectedRange] = useState<ExportRangeKey>('7d')
  const [isExporting, setIsExporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [message, setMessage] = useState('')

  async function handleExport(format: 'csv' | 'json') {
    setIsExporting(true)
    setErrorMessage('')
    setMessage('')

    try {
      const exportData = await fetchExportData(selectedRange)
      const content = format === 'json' ? buildExportJson(exportData) : buildExportCsv(exportData)
      const mimeType = format === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8'

      downloadTextFile(buildExportFilename(format), content, mimeType)
      setMessage(`已开始导出 ${format.toUpperCase()} 文件`)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsExporting(false)
    }
  }

  const selectedRangeInfo = getExportDateRange(selectedRange)

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700">Fitness Tracker MVP</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">数据导出</h1>
          <p className="mt-2 text-sm text-slate-600">
            导出当前登录用户的训练、有氧、饮食和体重数据，不包含任何 API Key 或 Supabase 配置。
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
          to="/"
        >
          返回仪表盘
        </Link>
      </div>

      {message ? <p className="mb-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
      {errorMessage ? <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p> : null}
      {isExporting ? <p className="mb-4 rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">导出准备中...</p> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">导出说明</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-600">
          <p>导出范围只包含当前登录用户的数据。</p>
          <p>导出内容包含力量训练、有氧记录、饮食记录和体重记录。</p>
          <p>JSON 适合备份和程序读取，CSV 适合手动查看和后续整理。</p>
        </div>

        <div className="mt-5">
          <p className="text-sm font-medium text-slate-700">日期范围选择</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {exportRangeOptions.map((option) => {
              const optionInfo = getExportDateRange(option)
              const isActive = selectedRange === option

              return (
                <button
                  className={`rounded-md px-4 py-2 text-sm font-semibold ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  key={option}
                  onClick={() => setSelectedRange(option)}
                  type="button"
                >
                  {optionInfo.label}
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-sm text-slate-600">
            当前范围：
            {selectedRangeInfo.startDate && selectedRangeInfo.endDate
              ? `${selectedRangeInfo.label}（${selectedRangeInfo.startDate} 至 ${selectedRangeInfo.endDate}）`
              : selectedRangeInfo.label}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isExporting}
            onClick={() => handleExport('json')}
            type="button"
          >
            导出 JSON
          </button>
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            disabled={isExporting}
            onClick={() => handleExport('csv')}
            type="button"
          >
            导出 CSV
          </button>
        </div>
      </section>
    </>
  )
}

export default ExportPage
