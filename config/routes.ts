export default [
	{
		path: '/user',
		layout: false,
		routes: [
			{
				path: '/user/login',
				layout: false,
				name: 'login',
				component: '../frontend/pages/user/Login',
			},
			{
				path: '/user/register',
				layout: false,
				name: 'register',
				component: '../frontend/pages/user/Register',
			},
			{
				path: '/user/forgot-password',
				layout: false,
				name: 'forgot-password',
				component: '../frontend/pages/user/ForgotPassword',
			},
			{
				path: '/user/reset-password',
				layout: false,
				name: 'reset-password',
				component: '../frontend/pages/user/ResetPassword',
			},
			{
				path: '/user',
				redirect: '/user/login',
			},
		],
	},
	{
		path: '/manager',
		layout: false,
		component: '../frontend/pages/Manager',
	},
	{
		path: '/student',
		layout: false,
		component: '../frontend/pages/Student/Home',
	},
	{
		path: '/student/form',
		layout: false,
		component: '../frontend/pages/Student',
	},
	{
		path: '/student/cutoff',
		layout: false,
		component: '../frontend/pages/Student/Cutoff',
	},
	{
		path: '/',
		redirect: '/user/login',
	},
	{
		component: '../frontend/pages/exception/404',
	},
];
