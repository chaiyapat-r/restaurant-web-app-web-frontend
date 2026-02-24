"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	Armchair,
	ShoppingBasket,
	Plus,
	Loader2,
	X,
	Minus,
	Trash2,
	CheckCircle2,
	History,
	AlertCircle
} from "lucide-react";
import { motion, AnimatePresence, Transition } from "framer-motion";

// --- Interfaces ---
interface OptionChoice {
	id: number;
	name: string;
	price: number;
	disable: boolean;
}

interface OptionGroup {
	id: number;
	name: string;
	isRequired: boolean;
	disable: boolean;
	choices: OptionChoice[];
}

interface MenuOptionGroup {
	id: number;
	menuId: number;
	optionGroupId: number;
	disable: boolean;
	optionGroup: OptionGroup;
}

interface Menu {
	id: number;
	name: string;
	price: number;
	imageUrl: string;
	categoryId: number;
	disable: boolean;
	optionGroups: MenuOptionGroup[];
}

interface OrderItemHistory {
	id: number;
	menuName: string;
	imageUrl: string;
	quantity: number;
	price: number;
	status: "PENDING" | "COOKING" | "READY_TO_SERVE" | "SERVED";
	options: { optionGroup: string; optionChoice: string }[];
}

function MenuPageContent() {
	const searchParams = useSearchParams();
	const token = searchParams.get("token");

	const [categories, setCategories] = useState<any[]>([]);
	const [menus, setMenus] = useState<Menu[]>([]);
	const [displayTableNumber, setDisplayTableNumber] = useState<string>("");
	const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
		null
	);
	const [loading, setLoading] = useState(true);
	const [isSending, setIsSending] = useState(false);
	const [cartCount, setCartCount] = useState(0);

	const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [quantity, setQuantity] = useState(1);
	const [note, setNote] = useState("");
	const [selectedOptions, setSelectedOptions] = useState<
		Record<number, number>
	>({});
	const [editingIndex, setEditingIndex] = useState<number | null>(null);

	const [isCartOpen, setIsCartOpen] = useState(false);
	const [cartItems, setCartItems] = useState<any[]>([]);

	const [isHistoryOpen, setIsHistoryOpen] = useState(false);
	const [historyItems, setHistoryItems] = useState<OrderItemHistory[]>([]);
	const [loadingHistory, setLoadingHistory] = useState(false);

	useEffect(() => {
		if (!token || token.trim() === "") {
			setLoading(false);
			return;
		}
		fetchInitialData();
	}, [token]);

	const fetchInitialData = async () => {
		try {
			const apiUrl = process.env.NEXT_PUBLIC_API_URL;
			const [catRes, menuRes, sessionRes] = await Promise.all([
				fetch(`${apiUrl}/categories`),
				fetch(`${apiUrl}/menus`),
				fetch(`${apiUrl}/table-session/session-info?token=${token}`)
			]);

			if (!sessionRes.ok) throw new Error("Invalid Session");

			const catData = await catRes.json();
			const menuData = await menuRes.json();
			const sessionData = await sessionRes.json();

			setCategories(catData);
			setMenus(menuData);

			if (sessionData && sessionData.tableNumber) {
				setDisplayTableNumber(sessionData.tableNumber);
				const savedCart = JSON.parse(
					localStorage.getItem(`cart_${sessionData.tableNumber}`) || "[]"
				);
				setCartItems(savedCart);
				setCartCount(savedCart.length);
			}

			const firstActiveCat = catData.find((c: any) => !c.disable);
			if (firstActiveCat) setSelectedCategoryId(firstActiveCat.id);
		} catch (error) {
			console.error("Fetch error:", error);
		} finally {
			setLoading(false);
		}
	};

	const updateCartState = (updatedCart: any[]) => {
		setCartItems(updatedCart);
		setCartCount(updatedCart.length);
		if (displayTableNumber) {
			localStorage.setItem(
				`cart_${displayTableNumber}`,
				JSON.stringify(updatedCart)
			);
		}
	};

	const fetchOrderHistory = async () => {
		if (!token) return;
		try {
			setLoadingHistory(true);
			const apiUrl = process.env.NEXT_PUBLIC_API_URL;
			const response = await fetch(`${apiUrl}/orders/my-orders?token=${token}`);
			if (response.ok) {
				const data = await response.json();
				if (data && data.orders) {
					const mappedOrders = data.orders.map((order: any) => ({
						id: order.id,
						menuName: order.menu.name,
						imageUrl: order.menu.imageUrl,
						quantity: order.quantity,
						price: order.priceAtTime,
						status: order.status,
						options: order.options.map((opt: any) => ({
							optionGroup: opt.optionGroup,
							optionChoice: opt.optionChoice
						}))
					}));
					setHistoryItems(mappedOrders);
				}
			}
		} catch (error) {
			console.error("Fetch history error:", error);
		} finally {
			setLoadingHistory(false);
		}
	};

	const handleOpenModal = (menu: Menu) => {
		setSelectedMenu(menu);
		setQuantity(1);
		setNote("");
		setSelectedOptions({});
		setEditingIndex(null);
		setIsModalOpen(true);
	};

	const calculateTotalPrice = () => {
		if (!selectedMenu) return 0;
		let extraPrice = 0;
		selectedMenu.optionGroups
			?.filter((mg) => !mg.disable && !mg.optionGroup.disable)
			.forEach((mg) => {
				const selectedChoiceId = selectedOptions[mg.optionGroup.id];
				if (selectedChoiceId) {
					const choice = mg.optionGroup.choices.find(
						(c) => c.id === selectedChoiceId
					);
					if (choice) extraPrice += Number(choice.price) || 0;
				}
			});
		return (Number(selectedMenu.price) + extraPrice) * quantity;
	};

	const handleAddToCart = () => {
		if (!selectedMenu) return;
		const missingRequired = selectedMenu.optionGroups.find(
			(mg) =>
				!mg.disable &&
				!mg.optionGroup.disable &&
				mg.optionGroup.isRequired &&
				!selectedOptions[mg.optionGroup.id]
		);
		if (missingRequired) {
			alert(`กรุณาเลือก "${missingRequired.optionGroup.name}"`);
			return;
		}
		const orderItem = {
			menuId: selectedMenu.id,
			name: selectedMenu.name,
			basePrice: selectedMenu.price,
			totalPrice: calculateTotalPrice(),
			quantity,
			note,
			selectedOptions,
			timestamp: new Date().getTime()
		};
		let updatedCart = [...cartItems];
		if (editingIndex !== null) {
			updatedCart[editingIndex] = orderItem;
		} else {
			updatedCart.push(orderItem);
		}
		updateCartState(updatedCart);
		setIsModalOpen(false);
	};

	const handleSendOrder = async () => {
		if (cartItems.length === 0 || isSending) return;
		if (!token) return alert("Session หมดอายุ กรุณาสแกนคิวอาร์โค้ดใหม่");
		try {
			setIsSending(true);
			const apiUrl = process.env.NEXT_PUBLIC_API_URL;
			const body = {
				token: token,
				items: cartItems.map((item) => ({
					menuId: item.menuId,
					quantity: item.quantity,
					remark: item.note,
					options: Object.entries(item.selectedOptions).map(
						([groupId, choiceId]) => {
							const menu = menus.find((m) => m.id === item.menuId);
							const mg = menu?.optionGroups.find(
								(g) => g.optionGroup.id === Number(groupId)
							);
							const choice = mg?.optionGroup.choices.find(
								(c) => c.id === choiceId
							);
							return {
								optionGroupId: Number(groupId),
								optionChoiceId: Number(choiceId),
								groupName: mg?.optionGroup.name || "Unknown",
								choiceName: choice?.name || "Unknown"
							};
						}
					)
				}))
			};
			const response = await fetch(`${apiUrl}/orders`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body)
			});
			if (response.ok) {
				if (displayTableNumber)
					localStorage.removeItem(`cart_${displayTableNumber}`);
				setCartItems([]);
				setCartCount(0);
				setIsCartOpen(false);
				alert("สั่งอาหารสำเร็จ!");
				fetchOrderHistory();
				// ลบ setIsHistoryOpen(true) ออกตามความต้องการ
			} else {
				const errorData = await response.json();
				alert(`ผิดพลาด: ${errorData.message || "สั่งซื้อไม่สำเร็จ"}`);
			}
		} catch (error) {
			console.error("Order error:", error);
		} finally {
			setIsSending(false);
		}
	};

	const handleEditItem = (index: number) => {
		const itemToEdit = cartItems[index];
		const menu = menus.find((m) => m.id === itemToEdit.menuId);
		if (menu) {
			setSelectedMenu(menu);
			setQuantity(itemToEdit.quantity);
			setNote(itemToEdit.note);
			setSelectedOptions(itemToEdit.selectedOptions);
			setEditingIndex(index);
			setIsCartOpen(false);
			setIsModalOpen(true);
		}
	};

	const handleRemoveItem = (index: number) => {
		const updatedCart = cartItems.filter((_, i) => i !== index);
		updateCartState(updatedCart);
	};

	const getStatusStyle = (status: string) => {
		switch (status) {
			case "PENDING":
				return "bg-gray-100 text-gray-500";
			case "COOKING":
				return "bg-blue-50 text-blue-500";
			case "READY_TO_SERVE":
				return "bg-orange-50 text-[#FF6B35]";
			case "SERVED":
				return "bg-green-50 text-green-500";
			default:
				return "bg-gray-100 text-gray-500";
		}
	};

	// --- แก้ไข Error TypeScript ตรงนี้ด้วย as const ---
	const modalTransition = {
		type: "tween",
		ease: "easeOut",
		duration: 0.3
	} as const;

	if (loading) {
		return (
			<div className="h-screen flex items-center justify-center bg-white">
				<Loader2 className="animate-spin text-[#FF6B35]" size={40} />
			</div>
		);
	}

	if (!token || !displayTableNumber) {
		return (
			<div className="h-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-6 text-center">
				<div className="bg-white p-8 rounded-[2.5rem] shadow-xl max-w-sm border border-gray-50">
					<AlertCircle className="text-red-500 w-16 h-16 mx-auto mb-6" />
					<h1 className="text-2xl font-black text-gray-800 mb-2">
						เข้าถึงไม่ได้
					</h1>
					<p className="text-gray-500 text-sm mb-8">
						กรุณาสแกน QR Code จากโต๊ะอาหารเพื่อเริ่มต้นครับ
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-screen bg-[#F8F9FA] overflow-hidden font-sans">
			{/* Sidebar Categories */}
			<aside className="w-24 sm:w-28 bg-white border-r border-gray-100 flex flex-col py-6 overflow-y-auto no-scrollbar">
				{categories
					.filter((c) => !c.disable)
					.map((cat) => (
						<button
							key={cat.id}
							onClick={() => setSelectedCategoryId(cat.id)}
							className={`py-6 px-2 text-center relative transition-colors ${selectedCategoryId === cat.id ? "text-[#FF6B35]" : "text-gray-400"}`}
						>
							<span className="text-xs sm:text-sm font-bold">{cat.name}</span>
							{selectedCategoryId === cat.id && (
								<div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FF6B35] rounded-r-full" />
							)}
						</button>
					))}
			</aside>

			<main className="flex-1 flex flex-col relative overflow-hidden">
				<header className="h-20 bg-white/80 backdrop-blur-md flex items-center justify-end px-6 gap-3 sticky top-0 z-10">
					<button
						onClick={() => {
							fetchOrderHistory();
							setIsHistoryOpen(true);
						}}
						className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-[#FF6B35] shadow-sm active:scale-90"
					>
						<History size={22} />
					</button>
					<div className="flex items-center gap-2 bg-[#FF6B35] text-white px-4 py-2 rounded-2xl shadow-lg">
						<Armchair size={18} />
						<span className="font-black text-lg">{displayTableNumber}</span>
					</div>
				</header>

				{/* Menu Grid */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28">
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
						{menus
							.filter((m) => m.categoryId === selectedCategoryId && !m.disable)
							.map((item) => (
								<div
									key={item.id}
									className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-gray-50 group hover:shadow-md transition-all"
								>
									<div className="aspect-[4/3] rounded-[1rem] overflow-hidden bg-gray-100 mb-4">
										<img
											src={item.imageUrl}
											alt={item.name}
											className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
										/>
									</div>
									<div className="flex justify-between items-end">
										<div>
											<h3 className="font-bold text-gray-800">{item.name}</h3>
											<span className="text-[#FF6B35] font-black text-xl">
												{item.price.toLocaleString()} ฿
											</span>
										</div>
										<button
											onClick={() => handleOpenModal(item)}
											className="bg-[#FF6B35] text-white p-3 rounded-2xl shadow-lg active:scale-90 transition-all"
										>
											<Plus size={20} />
										</button>
									</div>
								</div>
							))}
					</div>
				</div>

				<div className="fixed bottom-8 right-8 z-20">
					<button
						onClick={() => setIsCartOpen(true)}
						className="bg-[#FF6B35] w-16 h-16 sm:w-20 sm:h-20 rounded-[1.5rem] shadow-2xl flex items-center justify-center text-white relative active:scale-95 transition-all"
					>
						<ShoppingBasket className="w-8 h-8" />
						{cartCount > 0 && (
							<div className="absolute -top-2 -right-2 bg-white text-[#FF6B35] font-black text-xs w-8 h-8 rounded-full flex items-center justify-center border-4 border-[#FF6B35]">
								{cartCount}
							</div>
						)}
					</button>
				</div>
			</main>

			{/* Modal Food Detail */}
			<AnimatePresence>
				{isModalOpen && selectedMenu && (
					<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setIsModalOpen(false)}
							className="absolute inset-0 bg-black/60 backdrop-blur-sm"
						/>
						<motion.div
							initial={{ y: "100%" }}
							animate={{ y: 0 }}
							exit={{ y: "100%" }}
							transition={modalTransition}
							className="relative bg-white w-full sm:max-w-md h-full sm:h-auto sm:max-h-[85vh] sm:rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl"
						>
							<button
								onClick={() => setIsModalOpen(false)}
								className="absolute top-5 left-5 z-20 p-2 bg-black/20 backdrop-blur-md rounded-full text-white"
							>
								<X size={20} />
							</button>
							<div className="overflow-y-auto flex-1 no-scrollbar">
								<img
									src={selectedMenu.imageUrl}
									className="h-60 w-full object-cover"
									alt=""
								/>
								<div className="p-6 space-y-6">
									<div className="flex justify-between items-start">
										<h2 className="text-xl font-black text-gray-800">
											{selectedMenu.name}
										</h2>
										<span className="text-[#FF6B35] text-xl font-black">
											{selectedMenu.price.toLocaleString()} ฿
										</span>
									</div>
									{selectedMenu.optionGroups
										?.filter((mg) => !mg.disable && !mg.optionGroup.disable)
										.map((mg) => (
											<div key={mg.optionGroup.id} className="space-y-3">
												<h4 className="font-bold text-gray-800 flex items-center gap-2">
													<div className="w-1 h-4 bg-[#FF6B35] rounded-full" />
													{mg.optionGroup.name}
													{mg.optionGroup.isRequired && (
														<span className="text-[10px] bg-red-50 text-red-500 px-2 rounded">
															Required
														</span>
													)}
												</h4>
												<div className="grid grid-cols-1 gap-2">
													{mg.optionGroup.choices
														?.filter((c) => !c.disable)
														.map((choice) => (
															<label
																key={choice.id}
																className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${selectedOptions[mg.optionGroup.id] === choice.id ? "border-[#FF6B35] bg-orange-50/40" : "border-gray-100 bg-gray-50/50"}`}
															>
																<span className="font-semibold text-gray-700 text-sm">
																	{choice.name}
																</span>
																{choice.price > 0 && (
																	<span className="text-[#FF6B35] text-xs font-bold">
																		+{choice.price} ฿
																	</span>
																)}
																<input
																	type="radio"
																	name={`group-${mg.optionGroup.id}`}
																	className="hidden"
																	onChange={() =>
																		setSelectedOptions((prev) => ({
																			...prev,
																			[mg.optionGroup.id]: choice.id
																		}))
																	}
																/>
															</label>
														))}
												</div>
											</div>
										))}
								</div>
							</div>
							<div className="p-5 bg-white border-t border-gray-50 flex flex-col gap-4 pb-10">
								<div className="flex items-center justify-center gap-8">
									<button
										onClick={() => setQuantity(Math.max(1, quantity - 1))}
										className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center border"
									>
										<Minus size={18} />
									</button>
									<span className="text-xl font-black text-gray-800">
										{quantity}
									</span>
									<button
										onClick={() => setQuantity(quantity + 1)}
										className="w-9 h-9 rounded-xl bg-[#FF6B35] text-white flex items-center justify-center"
									>
										<Plus size={18} />
									</button>
								</div>
								<button
									onClick={handleAddToCart}
									className="w-full bg-[#FF6B35] text-white py-4 rounded-2xl font-bold"
								>
									{editingIndex !== null ? "Update Item" : "Add to cart"} —{" "}
									{calculateTotalPrice().toLocaleString()} ฿
								</button>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			{/* Cart Drawer */}
			<AnimatePresence>
				{isCartOpen && (
					<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setIsCartOpen(false)}
							className="absolute inset-0 bg-black/60 backdrop-blur-sm"
						/>
						<motion.div
							initial={{ y: "100%" }}
							animate={{ y: 0 }}
							exit={{ y: "100%" }}
							transition={modalTransition}
							className="relative bg-white w-full sm:max-w-md h-full sm:h-auto sm:max-h-[85vh] sm:rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl"
						>
							<div className="p-6 overflow-y-auto flex-1 no-scrollbar">
								<div className="flex justify-between items-center mb-6">
									<h2 className="text-xl font-black">My Cart</h2>
									<button onClick={() => setIsCartOpen(false)}>
										<X />
									</button>
								</div>
								{cartItems.length === 0 ? (
									<div className="text-center py-20 text-gray-300">
										Cart is empty
									</div>
								) : (
									<div className="space-y-6">
										{cartItems.map((item, index) => (
											<div key={index} className="flex gap-4">
												<div className="flex-1">
													<h4 className="font-bold text-gray-800 text-sm">
														{item.name} x {item.quantity}
													</h4>
													{item.selectedOptions &&
														Object.keys(item.selectedOptions).length > 0 && (
															<p className="text-[11px] text-gray-400 leading-tight mt-1">
																{Object.entries(item.selectedOptions)
																	.map(([groupId, choiceId]) => {
																		const menu = menus.find(
																			(m) => m.id === item.menuId
																		);
																		const mg = menu?.optionGroups.find(
																			(g) =>
																				g.optionGroup.id === Number(groupId)
																		);
																		const choice = mg?.optionGroup.choices.find(
																			(c) => c.id === choiceId
																		);
																		return choice?.name;
																	})
																	.filter(Boolean)
																	.join(", ")}
															</p>
														)}
													<div className="flex gap-3 mt-2">
														<button
															onClick={() => handleEditItem(index)}
															className="text-[#FF6B35] text-xs underline"
														>
															Edit
														</button>
														<button
															onClick={() => handleRemoveItem(index)}
															className="text-red-400 text-xs"
														>
															<Trash2 size={14} />
														</button>
													</div>
												</div>
												<span className="font-bold text-sm">
													{item.totalPrice.toLocaleString()} ฿
												</span>
											</div>
										))}
									</div>
								)}
							</div>
							<div className="p-6 bg-white border-t border-gray-50 pb-10">
								<div className="flex justify-between items-center mb-4">
									<span className="text-gray-400 font-bold">Total</span>
									<span className="text-[#FF6B35] text-2xl font-black">
										{cartItems
											.reduce((acc, cur) => acc + cur.totalPrice, 0)
											.toLocaleString()}{" "}
										฿
									</span>
								</div>
								<button
									onClick={handleSendOrder}
									disabled={cartItems.length === 0 || isSending}
									className="w-full bg-[#FF6B35] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
								>
									{isSending ? (
										<Loader2 className="animate-spin" />
									) : (
										<CheckCircle2 size={20} />
									)}
									{isSending ? "Sending..." : "Confirm Order"}
								</button>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			{/* History Modal */}
			<AnimatePresence>
				{isHistoryOpen && (
					<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setIsHistoryOpen(false)}
							className="absolute inset-0 bg-black/60 backdrop-blur-sm"
						/>
						<motion.div
							initial={{ y: "100%" }}
							animate={{ y: 0 }}
							exit={{ y: "100%" }}
							transition={modalTransition}
							className="relative bg-white w-full sm:max-w-md h-full sm:h-auto sm:max-h-[85vh] sm:rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl"
						>
							<div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 z-10">
								<h2 className="font-black text-xl">Order History</h2>
								<button
									onClick={() => setIsHistoryOpen(false)}
									className="p-2 hover:bg-gray-100 rounded-full transition-colors"
								>
									<X size={24} />
								</button>
							</div>
							<div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-white">
								{loadingHistory ? (
									<div className="flex justify-center py-20">
										<Loader2
											className="animate-spin text-[#FF6B35]"
											size={32}
										/>
									</div>
								) : historyItems.length === 0 ? (
									<div className="text-center py-20 text-gray-300">
										No order history yet.
									</div>
								) : (
									<div className="space-y-8">
										{historyItems.map((item) => (
											<div key={item.id} className="flex gap-4 group">
												<div className="w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
													<img
														src={item.imageUrl}
														className="w-full h-full object-cover"
														alt={item.menuName}
													/>
												</div>
												<div className="flex-1 flex flex-col justify-between py-0.5">
													<div className="flex justify-between items-start">
														<div className="space-y-1">
															<h5 className="font-bold text-gray-800 text-[15px]">
																{item.menuName}
															</h5>
															{item.options && item.options.length > 0 && (
																<p className="text-[11px] text-gray-400 leading-tight">
																	{item.options
																		.map((opt) => opt.optionChoice)
																		.join(", ")}
																</p>
															)}
														</div>
														<span className="font-black text-sm text-[#FF6B35] whitespace-nowrap">
															{(item.price * item.quantity).toLocaleString()} ฿
														</span>
													</div>
													<div className="flex justify-between items-center mt-2">
														<div
															className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide ${getStatusStyle(item.status)}`}
														>
															{item.status.replace(/_/g, " ")}
														</div>
														<div className="w-7 h-7 rounded-full border-2 border-orange-100 flex items-center justify-center text-[#FF6B35] font-black text-xs">
															{item.quantity}
														</div>
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
							{!loadingHistory && historyItems.length > 0 && (
								<div className="p-6 bg-white border-t border-gray-100 mt-auto pb-10">
									<div className="flex justify-between items-center">
										<span className="text-gray-800 font-bold text-lg">
											Subtotal
										</span>
										<span className="text-[#FF6B35] text-2xl font-black">
											{historyItems
												.reduce((acc, cur) => acc + cur.price * cur.quantity, 0)
												.toLocaleString()}{" "}
											฿
										</span>
									</div>
								</div>
							)}
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</div>
	);
}

export default function CustomerMenuPage() {
	return (
		<Suspense
			fallback={
				<div className="h-screen flex items-center justify-center">
					<Loader2 className="animate-spin text-[#FF6B35]" />
				</div>
			}
		>
			<MenuPageContent />
		</Suspense>
	);
}
