import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Menu, X, LogIn, UserPlus, Moon, Sun, ChevronDown, Languages } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';

interface NavItem {
	label: string;
	href?: string;
	onClick?: () => void;
	children?: NavItem[];
}

interface NavbarProps {
	user?: {
		username: string;
		accountType: string;
	} | null;
	navItems?: NavItem[];
	onLogout?: () => void;
	onLoginClick?: () => void;
	onRegisterClick?: () => void;
}

export default function Navbar({ user, navItems = [], onLogout, onLoginClick, onRegisterClick }: NavbarProps) {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [openDropdown, setOpenDropdown] = useState<number | null>(null);
	const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
	const navigate = useNavigate();
	const { theme, toggleTheme } = useTheme();
	const { language, setLanguage, t } = useTranslation();

	const handleLogout = () => {
		if (onLogout) {
			onLogout();
		}
		navigate('/login');
	};

	return (
		<>
			<motion.nav
				className="fixed top-4 left-0 right-0 z-50 px-4"
				initial={{ y: -100, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ type: 'spring', damping: 20, stiffness: 300 }}
			>
				<div className="max-w-6xl mx-auto">
					<div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl px-4 sm:px-6 py-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<motion.div
									whileHover={{ scale: 1.02 }}
									transition={{ type: 'spring', stiffness: 400 }}
									onClick={() => navigate('/')}
									className="cursor-pointer"
								>
									<h1 className="text-xl sm:text-2xl font-bold text-foreground">AprilFTD</h1>
								</motion.div>
								<div className="flex items-center gap-1">
									<motion.button
										onClick={toggleTheme}
										whileHover={{ scale: 1.1, rotate: 15 }}
										whileTap={{ scale: 0.9 }}
										className="p-2 text-foreground hover:bg-accent rounded-xl transition-colors"
									>
										{theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
									</motion.button>
									<div className="relative">
										<motion.button
											onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
											whileHover={{ scale: 1.1 }}
											whileTap={{ scale: 0.9 }}
											className="p-2 text-foreground hover:bg-accent rounded-xl transition-colors flex items-center gap-1"
										>
											<Languages className="w-5 h-5" />
											<span className="text-xs font-medium uppercase">{language}</span>
										</motion.button>
										<AnimatePresence>
											{isLangMenuOpen && (
												<motion.div
													initial={{ opacity: 0, y: -10 }}
													animate={{ opacity: 1, y: 0 }}
													exit={{ opacity: 0, y: -10 }}
													transition={{ duration: 0.2 }}
													className="absolute top-full mt-2 right-0 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[100px] z-50"
												>
													<button
														onClick={() => {
															setLanguage('fr');
															setIsLangMenuOpen(false);
														}}
														className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
															language === 'fr' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
														}`}
													>
														{t('navbar.french')}
													</button>
													<button
														onClick={() => {
															setLanguage('en');
															setIsLangMenuOpen(false);
														}}
														className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
															language === 'en' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
														}`}
													>
														{t('navbar.english')}
													</button>
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								</div>
							</div>

							{user ? (
								<>
									<div className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
										{navItems.map((item, index) => (
											item.children ? (
												<div key={index} className="relative">
													<motion.button
														onClick={() => setOpenDropdown(openDropdown === index ? null : index)}
														onMouseEnter={() => setOpenDropdown(index)}
														onMouseLeave={() => setOpenDropdown(null)}
														whileHover={{ scale: 1.05, y: -2 }}
														whileTap={{ scale: 0.95 }}
														className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-xl transition-colors"
													>
														{item.label}
														<ChevronDown className="w-4 h-4" />
													</motion.button>
													<AnimatePresence>
														{openDropdown === index && (
															<motion.div
																initial={{ opacity: 0, y: -10 }}
																animate={{ opacity: 1, y: 0 }}
																exit={{ opacity: 0, y: -10 }}
																transition={{ duration: 0.2 }}
																onMouseEnter={() => setOpenDropdown(index)}
																onMouseLeave={() => setOpenDropdown(null)}
																className="absolute top-full mt-2 left-0 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[160px] z-50"
															>
																{item.children.map((child, childIndex) => (
																	<motion.button
																		key={childIndex}
																		onClick={() => {
																			if (child.onClick) {
																				child.onClick();
																			} else if (child.href) {
																				navigate(child.href);
																			}
																			setOpenDropdown(null);
																		}}
																		whileHover={{ backgroundColor: 'hsl(var(--accent))' }}
																		className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors"
																	>
																		{child.label}
																	</motion.button>
																))}
															</motion.div>
														)}
													</AnimatePresence>
												</div>
											) : (
												<motion.button
													key={index}
													onClick={() => {
														if (item.onClick) {
															item.onClick();
														} else if (item.href) {
															navigate(item.href);
														}
													}}
													whileHover={{ scale: 1.05, y: -2 }}
													whileTap={{ scale: 0.95 }}
													className="px-4 py-2 text-sm font-medium text-foreground hover:bg-accent rounded-xl transition-colors"
												>
													{item.label}
												</motion.button>
											)
										))}
									</div>

									<div className="hidden md:flex items-center gap-3">
										<div className="text-sm">
											<p className="text-muted-foreground">
												{t('navbar.hello')}, <span className="text-foreground font-medium">{user.username}</span>
											</p>
										</div>
										{onLogout && (
											<motion.button
												onClick={handleLogout}
												whileHover={{ scale: 1.05, y: -2 }}
												whileTap={{ scale: 0.95 }}
												className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 rounded-xl transition-opacity"
											>
												<LogOut className="w-4 h-4" />
												{t('common.logout')}
											</motion.button>
										)}
									</div>

									<motion.button
										onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
										whileTap={{ scale: 0.9 }}
										className="md:hidden p-2 text-foreground hover:bg-accent rounded-xl transition-colors"
									>
										{isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
									</motion.button>
								</>
							) : (
								<div className="flex items-center gap-2">
									<motion.button
										onClick={onLoginClick}
										whileHover={{ scale: 1.05, y: -2 }}
										whileTap={{ scale: 0.95 }}
										className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-foreground bg-secondary hover:bg-accent rounded-xl transition-colors"
									>
										<LogIn className="w-4 h-4" />
										<span className="hidden sm:inline">{t('common.login')}</span>
									</motion.button>
									<motion.button
										onClick={onRegisterClick}
										whileHover={{ scale: 1.05, y: -2 }}
										whileTap={{ scale: 0.95 }}
										className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 rounded-xl transition-opacity"
									>
										<UserPlus className="w-4 h-4" />
										<span className="hidden sm:inline">{t('navbar.register')}</span>
									</motion.button>
								</div>
							)}
						</div>

						{user && (
							<div className="sm:hidden mt-2 pt-2 border-t border-border/50">
								<p className="text-xs text-muted-foreground">
									{t('navbar.hello')}, <span className="text-foreground font-medium">{user.username}</span>
								</p>
							</div>
						)}
					</div>
				</div>
			</motion.nav>

			<AnimatePresence>
				{isMobileMenuOpen && user && (
					<motion.div
						className="fixed inset-0 z-[60] md:hidden"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<motion.div
							className="absolute inset-0 bg-black/50"
							onClick={() => setIsMobileMenuOpen(false)}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
						/>
						<motion.div
							className="absolute top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-card shadow-2xl"
							initial={{ x: '-100%' }}
							animate={{ x: 0 }}
							exit={{ x: '-100%' }}
							transition={{ type: 'spring', damping: 30, stiffness: 300 }}
						>
							<div className="flex flex-col h-full">
								<div className="flex items-center justify-between px-6 py-6 border-b border-border">
									<h2 className="text-xl font-bold text-foreground">{t('navbar.menu')}</h2>
									<motion.button
										onClick={() => setIsMobileMenuOpen(false)}
										whileTap={{ scale: 0.9 }}
										className="p-2 text-foreground hover:bg-accent rounded-lg transition-colors"
									>
										<X className="w-5 h-5" />
									</motion.button>
								</div>

								<div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
									{navItems.map((item, index) => (
										item.children ? (
											<div key={index} className="space-y-1">
												<motion.div
													initial={{ opacity: 0, x: -20 }}
													animate={{ opacity: 1, x: 0 }}
													transition={{ delay: index * 0.05 }}
													className="px-4 py-3 text-base font-semibold text-foreground border border-border rounded-xl bg-accent/50"
												>
													{item.label}
												</motion.div>
												<div className="pl-4 space-y-1">
													{item.children.map((child, childIndex) => (
														<motion.button
															key={childIndex}
															onClick={() => {
																if (child.onClick) {
																	child.onClick();
																} else if (child.href) {
																	navigate(child.href);
																}
																setIsMobileMenuOpen(false);
															}}
															initial={{ opacity: 0, x: -20 }}
															animate={{ opacity: 1, x: 0 }}
															transition={{ delay: (index + childIndex) * 0.05 }}
															whileHover={{ x: 4 }}
															whileTap={{ scale: 0.98 }}
															className="w-full text-left px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors border border-border"
														>
															{child.label}
														</motion.button>
													))}
												</div>
											</div>
										) : (
											<motion.button
												key={index}
												onClick={() => {
													if (item.onClick) {
														item.onClick();
													} else if (item.href) {
														navigate(item.href);
													}
													setIsMobileMenuOpen(false);
												}}
												initial={{ opacity: 0, x: -20 }}
												animate={{ opacity: 1, x: 0 }}
												transition={{ delay: index * 0.05 }}
												whileHover={{ x: 4 }}
												whileTap={{ scale: 0.98 }}
												className="w-full text-left px-4 py-4 text-base font-medium text-foreground hover:bg-accent rounded-xl transition-colors border border-border"
											>
												{item.label}
											</motion.button>
										)
									))}
								</div>

								{onLogout && (
									<div className="px-4 py-6 border-t border-border">
										<motion.button
											onClick={() => {
												handleLogout();
												setIsMobileMenuOpen(false);
											}}
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
											className="w-full inline-flex items-center justify-center gap-2 px-4 py-4 text-base font-medium text-destructive-foreground bg-destructive hover:opacity-90 rounded-xl transition-opacity"
										>
											<LogOut className="w-5 h-5" />
											{t('common.logout')}
										</motion.button>
									</div>
								)}
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
