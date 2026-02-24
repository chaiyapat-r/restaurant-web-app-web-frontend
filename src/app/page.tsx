"use client";
import { UtensilsCrossed, QrCode } from "lucide-react";

export default function RootPage() {
	return (
		<div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8F9FA] p-6 text-center">
			<div className="w-24 h-24 bg-[#FF6B35] rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-orange-200">
				<UtensilsCrossed className="text-white" size={48} />
			</div>

			<h1 className="text-3xl font-black text-gray-800 mb-2">
				Orange <span className="text-[#FF6B35]">Table</span>
			</h1>

			<div className="max-w-xs bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 mt-4">
				<QrCode
					className="mx-auto text-gray-300 mb-4"
					size={64}
					strokeWidth={1.5}
				/>
				<p className="text-gray-600 font-medium">
					กรุณาสแกน <span className="text-[#FF6B35] font-bold">QR Code</span>{" "}
					บนโต๊ะอาหารเพื่อเริ่มสั่งอาหาร
				</p>
			</div>

			<p className="mt-4 text-sm text-gray-500 text-center">
				Looking for demo access?
				<a
					href="https://github.com/chaiyapat-r/restaurant-web-app-web-frontend/blob/master/README.md"
					target="_blank"
					rel="noopener noreferrer"
					className="text-[#FF6B35] hover:underline font-medium ml-1"
				>
					Check README.md
				</a>
			</p>

			<p className="absolute bottom-10 text-gray-400 text-sm font-medium">
				© 2026 Orange Table Restaurant
			</p>
		</div>
	);
}
