import { Link, useLocation } from 'react-router-dom'

type NavItem = {
  label: string
  to: string
  isActive: (pathname: string) => boolean
}

const navItems: NavItem[] = [
  {
    label: '仪表盘',
    to: '/',
    isActive: (pathname) => pathname === '/',
  },
  {
    label: '今日记录',
    to: '/today',
    isActive: (pathname) =>
      pathname === '/today' || pathname.startsWith('/workouts/') || pathname.startsWith('/meals/'),
  },
  {
    label: '训练模板',
    to: '/templates',
    isActive: (pathname) => pathname === '/templates' || pathname.startsWith('/templates/'),
  },
  {
    label: '目标管理',
    to: '/goals',
    isActive: (pathname) => pathname === '/goals',
  },
  {
    label: '体重记录',
    to: '/weight',
    isActive: (pathname) => pathname === '/weight',
  },
  {
    label: '历史记录',
    to: '/history',
    isActive: (pathname) => pathname === '/history',
  },
  {
    label: '数据统计',
    to: '/stats',
    isActive: (pathname) => pathname === '/stats',
  },
  {
    label: '趋势图表',
    to: '/trends',
    isActive: (pathname) => pathname === '/trends',
  },
  {
    label: '食物库',
    to: '/foods',
    isActive: (pathname) => pathname === '/foods',
  },
  {
    label: '数据导出',
    to: '/export',
    isActive: (pathname) => pathname === '/export',
  },
]

function AppNav() {
  const { pathname } = useLocation()

  return (
    <nav aria-label="主导航" className="mt-4 flex flex-wrap gap-2">
      {navItems.map((item) => {
        const isActive = item.isActive(pathname)

        return (
          <Link
            aria-current={isActive ? 'page' : undefined}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            }`}
            key={item.to}
            to={item.to}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export default AppNav
