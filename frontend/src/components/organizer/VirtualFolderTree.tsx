import React, { useState } from 'react';
import { VirtualTreeNode } from '../../types';
import {
  Folder,
  FolderOpen,
  FileText,
  FileImage,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { formatBytes } from '../../utils/formatters';
import clsx from 'clsx';

interface VirtualFolderTreeProps {
  tree: VirtualTreeNode;
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
}

export const VirtualFolderTree: React.FC<VirtualFolderTreeProps> = ({
  tree,
  selectedFileId,
  onSelectFile,
}) => {
  return (
    <div className="w-full text-sm select-none font-sans">
      <TreeNode
        node={tree}
        level={0}
        selectedFileId={selectedFileId}
        onSelectFile={onSelectFile}
        defaultExpanded={true}
      />
    </div>
  );
};

interface TreeNodeProps {
  node: VirtualTreeNode;
  level: number;
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
  defaultExpanded?: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  selectedFileId,
  onSelectFile,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || level <= 1);

  const isFolder = node.type === 'folder';
  const isSelected = !isFolder && node.fileId === selectedFileId;

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
        return <FileImage className="w-4 h-4 text-purple-500 shrink-0" />;
      case 'xlsx':
      case 'csv':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'ts':
      case 'js':
      case 'py':
      case 'json':
        return <FileCode className="w-4 h-4 text-slate-700 shrink-0" />;
      case 'zip':
      case 'tar':
      case 'gz':
        return <FileArchive className="w-4 h-4 text-amber-500 shrink-0" />;
      default:
        return <FileText className="w-4 h-4 text-blue-500 shrink-0" />;
    }
  };

  return (
    <div>
      <div
        onClick={() => {
          if (isFolder) {
            setIsExpanded(!isExpanded);
          } else if (node.fileId) {
            onSelectFile(node.fileId);
          }
        }}
        style={{ paddingLeft: `${Math.max(level * 18, 8)}px` }}
        className={clsx(
          'flex items-center justify-between py-1.5 pr-3 rounded-xl cursor-pointer transition-all group',
          isSelected && 'bg-brand-100 text-brand-950 font-semibold shadow-xs',
          !isSelected && 'hover:bg-zinc-100/80 text-charcoal'
        )}
      >
        <div className="flex items-center gap-2 min-w-0 pr-2">
          {isFolder ? (
            <>
              <button
                type="button"
                className="p-0.5 text-zinc-400 hover:text-brand-600 transition-colors shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-brand-600" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                )}
              </button>
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-brand-600 shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-brand-500 shrink-0" />
              )}
              <span className="font-bold text-xs sm:text-sm text-charcoal truncate">{node.name}</span>
            </>
          ) : (
            <>
              <span className="w-4" /> {/* Indent offset matching folder chevron */}
              {getFileIcon(node.name)}
              <span className="text-xs sm:text-sm text-charcoal-muted group-hover:text-charcoal font-medium truncate">
                {node.name}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 text-xs font-mono text-zinc-400">
          {isFolder ? (
            <span className="text-[11px] bg-brand-50 text-brand-700 border border-brand-200/60 px-2 py-0.5 rounded-full font-sans font-semibold">
              {node.fileCount} {node.fileCount === 1 ? 'file' : 'files'}
            </span>
          ) : (
            <span className="font-mono text-charcoal-subtle text-[11px]">{formatBytes(node.aggregateSize)}</span>
          )}
        </div>
      </div>

      {isFolder && isExpanded && node.children && (
        <div className="space-y-0.5">
          {node.children.map((child, idx) => (
            <TreeNode
              key={`${child.relativePath}-${idx}`}
              node={child}
              level={level + 1}
              selectedFileId={selectedFileId}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

