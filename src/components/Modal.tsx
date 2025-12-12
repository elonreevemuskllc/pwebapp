import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ReactNode, useEffect, useRef, useState } from 'react';

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: ReactNode;
	maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'md' }: ModalProps) {
	const maxWidthClasses = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-lg',
		xl: 'max-w-xl'
	};

	const modalRef = useRef<HTMLDivElement>(null);
	const [mouseDownOutside, setMouseDownOutside] = useState(false);

	useEffect(() => {
		function handleMouseDown(e: MouseEvent) {
			if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
				setMouseDownOutside(true);
			} else {
				setMouseDownOutside(false);
			}
		}

		function handleMouseUp(e: MouseEvent) {
			if (modalRef.current && !modalRef.current.contains(e.target as Node) && mouseDownOutside) {
				onClose();
			}
		}

		document.addEventListener('mousedown', handleMouseDown);
		document.addEventListener('mouseup', handleMouseUp);
		return () => {
			document.removeEventListener('mousedown', handleMouseDown);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, [mouseDownOutside, onClose]);

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
				>
					<motion.div
						ref={modalRef}
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.9, opacity: 0 }}
						className={`bg-card rounded-2xl shadow-2xl p-6 ${maxWidthClasses[maxWidth]} w-full max-h-[90vh] overflow-y-auto`}
					>
						<div className="flex items-center justify-between mb-5">
							<h2 className="text-xl font-bold text-foreground">{title}</h2>
							<button
								onClick={onClose}
								className="p-1.5 hover:bg-accent rounded-lg transition-colors"
							>
								<X className="w-5 h-5 text-muted-foreground" />
							</button>
						</div>
						{children}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
