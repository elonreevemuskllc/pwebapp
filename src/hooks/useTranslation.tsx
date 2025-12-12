import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { translations } from '../i18n/translations';
type Language = keyof typeof translations;

const resolve = (path: string, obj: any): string => {
	return path.split('.').reduce((prev, curr) => {
		return prev ? prev[curr] : null;
	}, obj);
};

interface TranslationContextType {
	language: Language;
	setLanguage: (lang: Language) => void;
	t: (key: string) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: ReactNode }) {
	const [language, setLanguageState] = useState<Language>(() => {
		const saved = localStorage.getItem('language');
		return (saved as Language) || 'fr';
	});

	const setLanguage = (lang: Language) => {
		setLanguageState(lang);
		localStorage.setItem('language', lang);
	};

	useEffect(() => {
		document.documentElement.lang = language;
	}, [language]);

	const t = useCallback(
		(key: string): string => {
			const translation = resolve(key, (translations as Record<Language, any>)[language]);
			if (!translation) {
				console.warn(`Translation not found for key: ${key}`);
				const fallback = resolve(key, translations.en);
				return fallback || key;
			}
			return translation;
		},
		[language]
	);

	const value = {
		language,
		setLanguage,
		t
	};

	return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useTranslation() {
	const context = useContext(TranslationContext);
	if (!context) {
		throw new Error('useTranslation must be used within TranslationProvider');
	}
	return context;
}
