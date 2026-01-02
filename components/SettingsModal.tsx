import React, { useState, useRef } from 'react';
import { X, UserPlus, Trash2, Download, Upload, Gift, Users, Trophy, Plus, Settings as SettingsIcon, Type, Check, AlertCircle, Timer, GripVertical } from 'lucide-react';
import { Participant, PrizeConfig, PrizeLevel, Winner } from '../types';
import * as XLSX from 'xlsx';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  resetWinners: () => void;
  prizes: PrizeConfig[];
  setPrizes: React.Dispatch<React.SetStateAction<PrizeConfig[]>>;
  winners: Winner[];
  title: string;
  setTitle: (t: string) => void;
  revealDelay: number;
  setRevealDelay: (ms: number) => void;
}

type Tab = 'general' | 'participants' | 'prizes' | 'winners';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  participants,
  setParticipants,
  resetWinners,
  prizes,
  setPrizes,
  winners,
  title,
  setTitle,
  revealDelay,
  setRevealDelay
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [inputText, setInputText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Prize State
  const [newPrizeName, setNewPrizeName] = useState('');
  const [newPrizeCount, setNewPrizeCount] = useState(1);
  const [newPrizeLevel, setNewPrizeLevel] = useState<PrizeLevel>(PrizeLevel.Consolation);

  // Delete Confirmation State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Drag and Drop State
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  if (!isOpen) return null;

  // --- Excel Logic ---

  const handleExportParticipants = () => {
    const data = participants.map(p => ({
      "姓名": p.name,
      "部门": p.department
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Participants");
    XLSX.writeFile(wb, "年会名单.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Map data to Participant structure
        const newParticipants: Participant[] = data.map((row: any, index: number) => ({
          id: `excel-${Date.now()}-${index}`,
          name: row['姓名'] || row['Name'] || row['name'] || `User ${index}`,
          department: row['部门'] || row['Department'] || row['dept'] || '综合部'
        }));

        if (newParticipants.length > 0) {
          setParticipants(prev => [...prev, ...newParticipants]);
          alert(`成功导入 ${newParticipants.length} 人`);
        } else {
          alert('未在Excel中找到有效数据。请确保包含“姓名”列。');
        }
      } catch (error) {
        console.error(error);
        alert('解析 Excel 失败');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportWinners = () => {
    if (winners.length === 0) {
      alert("暂无中奖名单");
      return;
    }
    const data = winners.map(w => {
      const prize = prizes.find(p => p.id === w.prizeId);
      return {
        "姓名": w.participant.name,
        "部门": w.participant.department,
        "奖项": prize?.name || '未知奖项',
        "等级": prize?.level || '',
        "中奖时间": new Date(w.timestamp).toLocaleTimeString()
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Winners");
    XLSX.writeFile(wb, "中奖名单.xlsx");
  };

  // --- Participant Logic ---

  const handleImportText = () => {
    const lines = inputText.split('\n');
    const newParticipants: Participant[] = lines
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map((line, idx) => {
        const parts = line.split(/[,\t，]/);
        return {
          id: `manual-${Date.now()}-${idx}`,
          name: parts[0].trim(),
          department: parts[1] ? parts[1].trim() : '综合部'
        };
      });
    setParticipants(prev => [...prev, ...newParticipants]);
    setInputText('');
  };

  const handleClear = () => {
    if(window.confirm('确定要清空所有参与者和中奖记录吗？')) {
      setParticipants([]);
      resetWinners();
    }
  };

  // --- Prize Logic ---

  const handleAddPrize = () => {
    if (!newPrizeName.trim()) return;
    const colors: Record<PrizeLevel, string> = {
        [PrizeLevel.Grand]: '#FFD700',
        [PrizeLevel.First]: '#C0C0C0',
        [PrizeLevel.Second]: '#CD7F32',
        [PrizeLevel.Third]: '#4DA6FF',
        [PrizeLevel.Consolation]: '#A3E635'
    };
    const newPrize: PrizeConfig = {
      id: `prize-${Date.now()}`,
      name: newPrizeName,
      count: newPrizeCount,
      level: newPrizeLevel,
      color: colors[newPrizeLevel] || '#ffffff'
    };
    setPrizes(prev => [...prev, newPrize]);
    setNewPrizeName('');
    setNewPrizeCount(1);
  };

  const handleDeletePrize = (id: string) => {
    if (confirmDeleteId === id) {
        // Confirmed, delete it
        setPrizes(currentPrizes => currentPrizes.filter(p => p.id !== id));
        setConfirmDeleteId(null);
    } else {
        // Set confirmation state
        setConfirmDeleteId(id);
        // Auto reset after 3 seconds
        setTimeout(() => {
            setConfirmDeleteId(current => current === id ? null : current);
        }, 3000);
    }
  };

  // --- Drag and Drop Logic ---

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragItem.current = index;
    // Set style
    e.currentTarget.style.opacity = '0.5';
    // Fix for Firefox
    e.dataTransfer.effectAllowed = 'move'; 
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault(); 
    if (dragItem.current === null) return;
    if (dragItem.current === index) return;

    // Reorder list
    const newPrizes = [...prizes];
    const draggedItem = newPrizes[dragItem.current];
    
    // Remove from old index
    newPrizes.splice(dragItem.current, 1);
    // Insert at new index
    newPrizes.splice(index, 0, draggedItem);
    
    // Update ref
    dragItem.current = index;
    // Update state
    setPrizes(newPrizes);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    dragItem.current = null;
    dragOverItem.current = null;
    e.currentTarget.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        className="bg-gray-900 border border-gray-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} 
      >
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <h2 className="text-2xl font-display font-bold text-white">设置</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 px-6 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('general')}
            className={`px-6 py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'general' ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            <SettingsIcon size={18} /> 
            常规设置
          </button>
          <button 
            onClick={() => setActiveTab('participants')}
            className={`px-6 py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'participants' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            <Users size={18} /> 
            人员管理
          </button>
          <button 
            onClick={() => setActiveTab('prizes')}
            className={`px-6 py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'prizes' ? 'border-yellow-500 text-yellow-400' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            <Gift size={18} /> 
            奖项设置
          </button>
          <button 
            onClick={() => setActiveTab('winners')}
            className={`px-6 py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'winners' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            <Trophy size={18} /> 
            中奖名单
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          
          {/* --- General Tab --- */}
          {activeTab === 'general' && (
             <div className="space-y-6">
                
                {/* Title Config */}
                <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700">
                   <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Type size={20} /> 界面标题
                   </h3>
                   <div className="space-y-2">
                      <label className="text-sm text-gray-400">活动主标题</label>
                      <input 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="请输入年会标题"
                        className="w-full bg-black border border-gray-700 rounded-xl p-4 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-display text-lg"
                      />
                      <p className="text-xs text-gray-500">该标题将显示在抽奖页面的正上方。</p>
                   </div>
                </div>

                {/* Reveal Speed Config */}
                <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700">
                   <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Timer size={20} /> 揭晓速度
                   </h3>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm text-gray-400">
                        <span>快速 (0.5s)</span>
                        <span className="text-emerald-400 font-bold">{revealDelay / 1000} 秒/人</span>
                        <span>慢速 (5s)</span>
                      </div>
                      <input 
                        type="range"
                        min="500"
                        max="5000"
                        step="500"
                        value={revealDelay}
                        onChange={(e) => setRevealDelay(Number(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <p className="text-xs text-gray-500">设置多名获奖者同时展示时的间隔时间，营造悬念感。</p>
                   </div>
                </div>

             </div>
          )}

          {/* ... Other tabs ... */}
          {activeTab === 'participants' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Users size={18} /> 快速操作</h3>
                    <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={handleClear}
                          className="bg-red-900/50 hover:bg-red-900 text-red-200 text-xs px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={14} /> 清空
                        </button>
                    </div>
                 </div>

                 <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Upload size={18} /> Excel 导入/导出</h3>
                    <div className="flex flex-wrap gap-2">
                        <input type="file" accept=".xlsx, .xls" ref={fileInputRef} className="hidden" onChange={handleImportExcel} />
                        <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs px-3 py-2 rounded-lg transition-colors flex items-center gap-1">
                          <Upload size={14} /> 导入 Excel
                        </button>
                        <button onClick={handleExportParticipants} className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-2 rounded-lg transition-colors flex items-center gap-1">
                          <Download size={14} /> 导出名单
                        </button>
                    </div>
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="block text-sm font-medium text-gray-300">手动粘贴 (格式: 姓名,部门)</label>
                 <div className="flex gap-2">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="张三, 技术部&#10;李四, 销售部"
                      className="flex-1 h-24 bg-black border border-gray-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono text-sm"
                    />
                    <button onClick={handleImportText} disabled={!inputText.trim()} className="bg-gray-700 hover:bg-gray-600 text-white px-4 rounded-xl font-medium transition-colors disabled:opacity-50 flex flex-col items-center justify-center gap-1">
                      <UserPlus size={20} /> <span className="text-xs">添加</span>
                    </button>
                 </div>
              </div>

              <div className="border border-gray-800 rounded-xl overflow-hidden bg-black/20">
                 <div className="bg-gray-800/50 px-4 py-2 text-xs font-semibold text-gray-400 flex justify-between">
                   <span>人员列表</span>
                   <span>共 {participants.length} 人</span>
                 </div>
                 <div className="max-h-60 overflow-y-auto divide-y divide-gray-800">
                   {participants.map(p => (
                     <div key={p.id} className="px-4 py-2 flex justify-between items-center text-sm hover:bg-white/5">
                       <span className="text-white">{p.name}</span>
                       <span className="text-gray-500">{p.department}</span>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'prizes' && (
            <div className="space-y-6">
               <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">添加新奖项</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div>
                          <label className="text-xs text-gray-500 block mb-1">奖品名称</label>
                          <input value={newPrizeName} onChange={(e) => setNewPrizeName(e.target.value)} placeholder="例如：现金大奖" className="w-full bg-black border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-yellow-500 outline-none" />
                      </div>
                      <div>
                          <label className="text-xs text-gray-500 block mb-1">名额数量</label>
                          <input type="number" min="1" value={newPrizeCount} onChange={(e) => setNewPrizeCount(parseInt(e.target.value) || 1)} className="w-full bg-black border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-yellow-500 outline-none" />
                      </div>
                      <div>
                          <label className="text-xs text-gray-500 block mb-1">奖项等级</label>
                          <select value={newPrizeLevel} onChange={(e) => setNewPrizeLevel(e.target.value as PrizeLevel)} className="w-full bg-black border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-yellow-500 outline-none">
                             {Object.values(PrizeLevel).map(level => (
                                 <option key={level} value={level}>{level}</option>
                             ))}
                          </select>
                      </div>
                      <button onClick={handleAddPrize} className="bg-yellow-600 hover:bg-yellow-500 text-white p-2 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2">
                        <Plus size={16} /> 添加
                      </button>
                  </div>
               </div>
               <div className="space-y-3">
                  {prizes.map((prize, index) => (
                      <div 
                        key={prize.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        className="flex items-center justify-between bg-gray-800/50 p-4 rounded-xl border border-gray-700 cursor-move transition-all active:scale-[0.99] hover:bg-gray-800"
                      >
                          <div className="flex items-center gap-4">
                              <div className="text-gray-600 hover:text-gray-300 cursor-grab active:cursor-grabbing">
                                <GripVertical size={20} />
                              </div>
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-gray-900" style={{ backgroundColor: prize.color }}>
                                 {prize.name.charAt(0)}
                              </div>
                              <div>
                                  <div className="text-white font-bold">{prize.name}</div>
                                  <div className="text-xs text-gray-400">{prize.level} · {prize.count} 个名额</div>
                              </div>
                          </div>
                          
                          <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePrize(prize.id);
                            }} 
                            className={`
                                ml-4 p-2 rounded-lg transition-all duration-200 flex items-center justify-center
                                ${confirmDeleteId === prize.id 
                                    ? 'bg-red-600 text-white w-20' 
                                    : 'text-gray-500 hover:text-red-400 hover:bg-gray-700 w-10'
                                }
                            `}
                          >
                             {confirmDeleteId === prize.id ? (
                                 <span className="text-xs font-bold animate-pulse">确定?</span>
                             ) : (
                                 <Trash2 size={18} className="pointer-events-none" />
                             )}
                          </button>
                      </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'winners' && (
             <div className="space-y-6">
                 <div className="flex justify-between items-center bg-gray-800/30 p-4 rounded-xl border border-gray-700">
                     <div>
                        <h3 className="text-white font-bold">中奖名单</h3>
                        <p className="text-xs text-gray-500">共 {winners.length} 人中奖</p>
                     </div>
                     <button onClick={handleExportWinners} className="bg-emerald-600/80 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                        <Download size={16} /> 导出 Excel
                     </button>
                 </div>
                 <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="text-xs uppercase bg-gray-800/50 text-gray-300">
                            <tr>
                                <th className="px-4 py-3">姓名</th>
                                <th className="px-4 py-3">部门</th>
                                <th className="px-4 py-3">奖项</th>
                                <th className="px-4 py-3">时间</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {winners.map((w, i) => {
                                const prize = prizes.find(p => p.id === w.prizeId);
                                return (
                                    <tr key={i} className="hover:bg-white/5">
                                        <td className="px-4 py-3 text-white font-medium">{w.participant.name}</td>
                                        <td className="px-4 py-3">{w.participant.department}</td>
                                        <td className="px-4 py-3 text-yellow-500">{prize?.name}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{new Date(w.timestamp).toLocaleTimeString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                 </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};
