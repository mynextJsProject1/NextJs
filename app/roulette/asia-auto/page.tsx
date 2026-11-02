"use client";

import React from 'react';
import { 
  Menu, Home, Volume2, BarChart2, Settings, Star, 
  RotateCcw, RotateCw, Plus, Minus, X, Undo2 
} from 'lucide-react';

export default function RouletteGame() {
  // টেবিলের সংখ্যা এবং তাদের রং (Standard European Roulette)
  const numbers = [
    { num: 3, color: 'red' }, { num: 6, color: 'black' }, { num: 9, color: 'red' }, { num: 12, color: 'red' }, { num: 15, color: 'black' }, { num: 18, color: 'red' }, { num: 21, color: 'red' }, { num: 24, color: 'black' }, { num: 27, color: 'red' }, { num: 30, color: 'red' }, { num: 33, color: 'black' }, { num: 36, color: 'red' },
    { num: 2, color: 'black' }, { num: 5, color: 'red' }, { num: 8, color: 'black' }, { num: 11, color: 'black' }, { num: 14, color: 'red' }, { num: 17, color: 'black' }, { num: 20, color: 'black' }, { num: 23, color: 'red' }, { num: 26, color: 'black' }, { num: 29, color: 'black' }, { num: 32, color: 'red' }, { num: 35, color: 'black' },
    { num: 1, color: 'red' }, { num: 4, color: 'black' }, { num: 7, color: 'red' }, { num: 10, color: 'black' }, { num: 13, color: 'black' }, { num: 16, color: 'red' }, { num: 19, color: 'red' }, { num: 22, color: 'black' }, { num: 25, color: 'red' }, { num: 28, color: 'black' }, { num: 31, color: 'black' }, { num: 34, color: 'red' },
  ];

  const history = [29, 25, 16, 33, 20, 17, 5, 9, 36, 35];

  return (
    <div className="w-full h-[100dvh] bg-[#182b35] text-white flex flex-col overflow-hidden relative font-sans select-none">
      
      {/* Background Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1f3643] to-[#121e25] z-0"></div>

      {/* Top Header */}
      <div className="absolute top-0 left-0 w-full p-2 flex justify-between items-start z-10">
        <div className="text-[#d4af37] font-serif italic text-xl leading-tight drop-shadow-md">
          European<br/>ROULETTE
        </div>
        <div className="flex flex-col gap-3 opacity-70 mt-1 mr-1">
          <BarChart2 size={20} />
          <div className="w-6 h-6 rounded-full border border-gray-400 flex items-center justify-center">
            <div className="w-3 h-4 border border-gray-400 rounded-sm"></div>
          </div>
        </div>
      </div>

      {/* Left Sidebar - History */}
      <div className="absolute left-2 top-24 flex flex-col gap-1 z-10 w-8">
        <div className="text-gray-400 mb-1 flex justify-center"><RotateCcw size={14} /></div>
        {history.map((num, i) => {
          const isRed = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(num);
          return (
            <div key={i} className={`${isRed ? 'bg-[#b3272e]' : 'bg-[#1a1a1a]'} text-white text-[11px] font-bold text-center py-1 rounded-sm border border-white/10 shadow-sm`}>
              {num}
            </div>
          );
        })}
      </div>

      {/* Right Sidebar - Controls */}
      <div className="absolute right-2 top-20 flex flex-col gap-3 z-10 items-center">
        <button className="w-8 h-8 rounded-full bg-gradient-to-b from-[#3a4a54] to-[#1f2c34] border border-[#5a6b75] flex items-center justify-center shadow-md">
          <Star size={14} className="text-gray-300" />
        </button>
        <button className="w-8 h-8 rounded-full bg-gradient-to-b from-[#3a4a54] to-[#1f2c34] border border-[#5a6b75] flex items-center justify-center shadow-md">
          <Plus size={16} className="text-gray-300" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#3a4a54] to-[#1f2c34] border border-[#5a6b75] flex flex-col items-center justify-center shadow-md">
          <span className="text-[8px] leading-none mb-0.5 text-gray-300">2X</span>
        </div>
        <button className="w-8 h-8 rounded-full bg-gradient-to-b from-[#3a4a54] to-[#1f2c34] border border-[#5a6b75] flex items-center justify-center shadow-md">
          <Undo2 size={14} className="text-gray-300" />
        </button>
        <button className="w-8 h-8 rounded-full bg-gradient-to-b from-[#3a4a54] to-[#1f2c34] border border-[#5a6b75] flex items-center justify-center shadow-md mt-2">
          <X size={16} className="text-gray-300" />
        </button>
        
        {/* Chips Area */}
        <div className="flex flex-col gap-2 mt-4 relative">
            <div className="w-8 h-8 rounded-full border-2 border-dashed border-red-500 bg-white flex items-center justify-center shadow-lg">
                <span className="text-red-500 text-[10px] font-bold">25</span>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-yellow-500 bg-white flex items-center justify-center shadow-lg -ml-1 z-10 absolute top-6">
                <span className="text-black text-xs font-bold">0.5</span>
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-white bg-red-600 flex items-center justify-center shadow-lg mt-10">
                <span className="text-white text-[10px] font-bold">1</span>
            </div>
        </div>
      </div>

      {/* Main Game Area - Wheel & Table */}
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden items-center">
        
        {/* Wheel Container */}
        <div className="w-[85%] aspect-square mt-16 mb-4 relative flex items-center justify-center">
            {/* 
              NOTE: এখানে আসল রুলেট হুইলের ছবি ব্যবহার করতে হবে। 
              আপাতত একটি প্লেসহোল্ডার ইমেজ দেওয়া হলো। 
            */}
            <div className="w-full h-full rounded-full border-4 border-[#5c3a21] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Roulette_-_detail.jpg/1200px-Roulette_-_detail.jpg" 
                  alt="Roulette Wheel" 
                  className="w-full h-full object-cover scale-110"
                  style={{ transform: 'rotate(15deg)' }}
                />
                {/* Center Spindle */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full border-4 border-gray-600 shadow-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-gray-600 rounded-full"></div>
                </div>
            </div>
        </div>

        {/* Betting Table */}
        <div className="w-[90%] flex-1 flex flex-col justify-end pb-12 relative mt-4">
            {/* The Table Grid */}
            <div className="w-full border border-gray-500 bg-[#1f2c34] flex flex-col">
                
                {/* Top Green 0 */}
                <div className="w-1/3 mx-auto bg-[#1a6b32] border border-gray-500 text-center text-sm font-bold py-1">
                    0
                </div>

                <div className="flex flex-row w-full">
                    {/* Left Outside Bets */}
                    <div className="w-[15%] flex flex-col border-r border-gray-500">
                        <div className="flex-1 border-b border-gray-500 flex flex-col items-center justify-center text-[9px] text-gray-300 py-1"><span>1-18</span></div>
                        <div className="flex-1 border-b border-gray-500 flex flex-col items-center justify-center text-[9px] text-gray-300 py-1"><span>Even</span></div>
                        <div className="flex-1 border-b border-gray-500 flex flex-col items-center justify-center py-1">
                            <div className="w-3 h-3 bg-red-600 transform rotate-45"></div>
                        </div>
                        <div className="flex-1 border-b border-gray-500 flex flex-col items-center justify-center py-1">
                            <div className="w-3 h-3 bg-black border border-gray-400 transform rotate-45"></div>
                        </div>
                        <div className="flex-1 border-b border-gray-500 flex flex-col items-center justify-center text-[9px] text-gray-300 py-1"><span>Odd</span></div>
                        <div className="flex-1 flex flex-col items-center justify-center text-[9px] text-gray-300 py-1"><span>19-36</span></div>
                    </div>

                    {/* Number Grid (3x12) */}
                    <div className="w-[70%] grid grid-cols-3 grid-rows-12">
                        {numbers.map((item, index) => (
                            <div 
                                key={index} 
                                className={`${item.color === 'red' ? 'bg-[#b3272e]' : 'bg-[#1a1a1a]'} border border-gray-500 flex items-center justify-center text-xs font-bold`}
                            >
                                {item.num}
                            </div>
                        ))}
                    </div>

                    {/* Right 2:1 Bets */}
                    <div className="w-[15%] flex flex-col border-l border-gray-500">
                        <div className="flex-1 border-b border-gray-500 flex items-center justify-center text-[10px] text-gray-300">2:1</div>
                        <div className="flex-1 border-b border-gray-500 flex items-center justify-center text-[10px] text-gray-300">2:1</div>
                        <div className="flex-1 flex items-center justify-center text-[10px] text-gray-300">2:1</div>
                    </div>
                </div>
            </div>

            {/* Table Text Info */}
            <div className="text-center mt-2 text-[8px] text-gray-400 uppercase tracking-wider">
                <p>Table Coverage 40.54%</p>
                <p>Table limits min 0.10 eur / max 500.00 eur</p>
            </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="absolute bottom-0 w-full bg-black/40 backdrop-blur-sm text-[9px] text-gray-300 flex flex-col z-20 border-t border-white/10">
        {/* Top Row */}
        <div className="flex justify-between items-center px-2 py-1 border-b border-white/5">
            <div className="flex gap-2 items-center">
                <Menu size={14} />
                <Home size={14} />
            </div>
            <div className="flex items-center gap-1 text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span>Connecting...</span>
            </div>
            <div className="flex gap-2 items-center">
                <Volume2 size={12} />
                <span>22814040</span>
            </div>
        </div>
        
        {/* Bottom Row (Stats) */}
        <div className="flex justify-between items-center px-2 py-1 font-mono">
            <div className="flex gap-4 w-full justify-between">
                <div className="flex flex-col">
                    <span className="text-[7px] text-gray-400">BALANCE IN EUR</span>
                    <span className="text-white font-bold text-xs">9996.50</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[7px] text-gray-400">BET IN EUR</span>
                    <span className="text-white font-bold text-xs">2.50</span>
                </div>
                <div className="flex flex-col text-right">
                    <span className="text-[7px] text-gray-400">WIN IN EUR</span>
                    <span className="text-white font-bold text-xs">0.00</span>
                </div>
            </div>
            <div className="text-[7px] text-gray-500 font-sans tracking-widest ml-2">SYNOT</div>
        </div>
      </div>

    </div>
  );
}
