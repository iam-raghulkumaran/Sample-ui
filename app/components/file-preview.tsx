"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const FILES = [
  {
    id: "project-logic",
    name: "Test.2readme.txt",
    path: "/files/Web-1.txt",
  },
  {
    id: "api-sample",
    name: "API-Sample.txt",
    path: "/files/Web-2.txt",
  },
  {
    id: "sql-schema",
    name: "SQL-Schema.txt",
    path: "/files/Web-3.txt",
  },
]

export default function FilePreview() {
  const [selectedFile, setSelectedFile] = useState<string>("")
  const [fileContent, setFileContent] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const handlePreview = async () => {
    if (!selectedFile) return

    setIsLoading(true)
    try {
      const file = FILES.find((f) => f.id === selectedFile)
      if (!file) return

      const response = await fetch(file.path)
      const content = await response.text()
      setFileContent(content)
    } catch (error) {
      console.error("Error loading file:", error)
      setFileContent("Error loading file content")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex gap-2">
        <Select value={selectedFile} onValueChange={setSelectedFile}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a file" />
          </SelectTrigger>
          <SelectContent>
            {FILES.map((file) => (
              <SelectItem key={file.id} value={file.id}>
                {file.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handlePreview} disabled={!selectedFile || isLoading}>
          {isLoading ? "Loading..." : "Preview"}
        </Button>
      </div>

      {fileContent && (
        <div className="border rounded-lg p-4 bg-muted">
          <pre className="text-sm whitespace-pre-wrap break-words max-h-96 overflow-auto font-mono">
            <code>{fileContent}</code>
          </pre>
        </div>
      )}
    </div>
  )
}
