import { CourseBreadcrumb } from './CourseBreadcrumb'
import { BreadcrumbItem } from '../utils/navigation'

interface CategoryBannerProps {
  title: string
  description?: string
  breadcrumbItems: BreadcrumbItem[]
  imageUrl?: string
  totalCourses?: number
}

export function CategoryBanner({
  title,
  description,
  breadcrumbItems,
  imageUrl,
  totalCourses
}: CategoryBannerProps) {
  return (
    <div className="relative bg-gradient-to-r from-purple-900 to-purple-700 text-white overflow-hidden">
      {/* Background Image Overlay */}
      {imageUrl && (
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}

      <div className="relative container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <CourseBreadcrumb 
          items={breadcrumbItems} 
          className="mb-4"
        />

        {/* Title and Description */}
        <div className="max-w-3xl">
          <h1 className="text-4xl mb-3">{title}</h1>
          
          {description && (
            <p className="text-lg text-gray-200 mb-4">{description}</p>
          )}

          {totalCourses !== undefined && (
            <p className="text-sm text-gray-300">
              {totalCourses.toLocaleString()} courses available
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
